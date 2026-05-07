import path from 'node:path';
import fs from 'node:fs/promises';
import { ensureDir } from './lib.mjs';

/**
 * @param {{
 *   runDir: string,
 *   id: string,
 *   brief: object,
 *   attempts: { kind: string, attempt: number, prompt: string, ok: boolean, issues: string[] }[],
 *   qa: import('./qa.mjs').QaResult,
 *   palette: { sphereColors: number[], fieldDecorColors: number[], backgroundColor: number },
 * }} args
 */
export async function writeThemeReport({ runDir, id, brief, attempts, qa, palette }) {
  await ensureDir(runDir);
  const reportPath = path.join(runDir, 'report.md');
  const lines = [];
  lines.push(`# ${id} — theme-gen report`, '');
  lines.push(`- **Display name**: ${brief.displayName ?? '(unspecified)'}`);
  lines.push(`- **Audience**: ${brief.audience ?? '(unspecified)'}`);
  lines.push(`- **QA pass**: ${qa.pass ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push('## Palette');
  lines.push('- sphereColors:');
  for (const c of palette.sphereColors) lines.push(`  - \`#${c.toString(16).padStart(6, '0')}\``);
  lines.push('- fieldDecorColors:');
  for (const c of palette.fieldDecorColors) lines.push(`  - \`#${c.toString(16).padStart(6, '0')}\``);
  lines.push(`- backgroundColor: \`#${palette.backgroundColor.toString(16).padStart(6, '0')}\``);
  lines.push('');
  lines.push('## Generation attempts');
  for (const a of attempts) {
    lines.push(`### ${a.kind} — attempt ${a.attempt + 1} ${a.ok ? '(ok)' : '(rejected)'}`);
    lines.push('Prompt:');
    lines.push('```');
    lines.push(a.prompt);
    lines.push('```');
    if (a.issues.length) {
      lines.push('Issues:');
      for (const i of a.issues) lines.push(`- ${i}`);
    }
    lines.push('');
  }
  lines.push('## QA layers');
  for (const layer of qa.layers) {
    lines.push(`### ${layer.layer}: ${layer.pass ? 'pass' : 'fail'}`);
    if (layer.issues.length === 0) lines.push('- (no issues)');
    for (const iss of layer.issues) lines.push(`- ${iss.asset || 'general'}: ${iss.note}`);
    lines.push('');
  }
  if (qa.screenshots.length) {
    lines.push('## Screenshots');
    for (const s of qa.screenshots) {
      lines.push(`![screenshot](${path.relative(runDir, s)})`);
    }
  }
  await fs.writeFile(reportPath, lines.join('\n'));
  return reportPath;
}

/**
 * @param {{ runsRoot: string, runDir: string, themes: { id: string, qaPass: boolean, reportPath: string }[] }} args
 */
export async function writeIndexReport({ runDir, themes }) {
  await ensureDir(runDir);
  const indexPath = path.join(runDir, 'index.md');
  const lines = ['# theme-gen run index', ''];
  for (const t of themes) {
    const rel = path.relative(runDir, t.reportPath);
    lines.push(`- **${t.id}** — ${t.qaPass ? 'PASS' : 'FAIL'} — [report](${rel})`);
  }
  await fs.writeFile(indexPath, lines.join('\n'));
  return indexPath;
}
