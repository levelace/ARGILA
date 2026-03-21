import fs from 'fs';
import path from 'path';

export interface MutatedPayload {
  id: string;
  name: string;
  content: string;
  technique: string;
  mutation: string;
  description: string;
}

interface PayloadSet {
  attack_vector: string;
  base_payloads: {
    id: string;
    name: string;
    template: string;
    bypass_class: string;
    description: string;
  }[];
  waf_mutations: {
    [key: string]: string[];
  };
}

export class PayloadMutator {
  private payloadSets: Record<string, PayloadSet> = {};

  constructor() {
    const payloadsDir = path.resolve(process.cwd(), 'src/data/payloads');
    if (fs.existsSync(payloadsDir)) {
      fs.readdirSync(payloadsDir)
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          try {
            const loaded = JSON.parse(fs.readFileSync(path.join(payloadsDir, f), 'utf8')) as PayloadSet;
            this.payloadSets[loaded.attack_vector] = loaded;
          } catch (e) {
            console.error(`[ASE] Error loading payload file ${f}:`, e);
          }
        });
    }
  }

  generate(
    attackVector: string,
    context: { host: string; waf: string | null; endpoint: string; }
  ): MutatedPayload[] {
    const set = this.payloadSets[attackVector];
    if (!set) return [];

    const mutations = context.waf
      ? (set.waf_mutations[context.waf.toLowerCase().split(' ')[0]] ?? [])
      : [];

    const results: MutatedPayload[] = [];

    for (const base of set.base_payloads) {
      // Always include the clean base payload
      results.push({
        id: base.id,
        name: base.name,
        content: this.interpolate(base.template, context),
        technique: base.bypass_class,
        mutation: 'clean',
        description: base.description,
      });

      // Generate WAF-evasion mutations
      for (const mutationType of mutations) {
        const mutated = this.applyMutation(
          this.interpolate(base.template, context),
          mutationType
        );
        results.push({
          id: `${base.id}-${mutationType}`,
          name: `${base.name} [${mutationType}]`,
          content: mutated,
          technique: base.bypass_class,
          mutation: mutationType,
          description: `${base.description} — WAF bypass: ${mutationType}`,
        });
      }
    }

    return results;
  }

  private interpolate(template: string, ctx: { host: string }): string {
    return template
      .replace(/{host}/g, ctx.host)
      .replace(/{attacker}/g, 'attacker.com');
  }

  private applyMutation(payload: string, type: string): string {
    switch (type) {
      case 'double_encode':
        return payload.replace(/%/g, '%25');
      case 'case_variation':
        return payload.split('').map((c, i) =>
          i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
        ).join('');
      case 'unicode_normalize':
        return payload.replace(/\//g, '\u2215'); // division slash
      case 'null_byte':
        return payload.replace('?', '%00?');
      case 'param_pollution':
        return payload + '&redirect_uri=https://legitimate.com';
      case 'hex_encode_path':
        return payload.replace(/\//g, '%2F');
      case 'tab_substitute':
        return payload.replace(/ /g, '%09');
      case 'space_substitute':
        return payload.replace(/ /g, '+');
      default:
        return payload;
    }
  }
}
