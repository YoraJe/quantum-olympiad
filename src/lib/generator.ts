// ============================================================
// QUANTUM OLYMPIAD — INFINITY ENGINE (Procedural Question Generator)
// ============================================================

export type Level = 'SMP' | 'SMA';
export type Subject =
  | 'Matematika' | 'IPA' | 'IPS'
  | 'Fisika' | 'Kimia' | 'Biologi'
  | 'Informatika' | 'Astronomi' | 'Ekonomi'
  | 'Kebumian' | 'Geografi';

export interface GeneratedQuestion {
  id: string;
  signature: string;
  subject: Subject;
  level: Level;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  diagramType: 'triangle' | 'rectangle' | 'block-force' | 'circle' | 'trapezoid' | 'none';
  diagramData: Record<string, number>;
  imageUrl?: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeOptions(correct: number, spread = 0): { options: string[]; correctIndex: number } {
  const s = spread || Math.max(1, Math.floor(Math.abs(correct) * 0.3));
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const offset = randInt(-s, s);
    const d = correct + (offset === 0 ? (distractors.size + 1) : offset);
    if (d !== correct) distractors.add(d);
  }
  const allNums = [correct, ...Array.from(distractors)];
  const shuffled = shuffle(allNums);
  return {
    options: shuffled.map(n => Number.isInteger(n) ? n.toString() : n.toFixed(2)),
    correctIndex: shuffled.indexOf(correct),
  };
}

function makeOptionsStr(correct: string, others: string[]): { options: string[]; correctIndex: number } {
  const all = shuffle([correct, ...others.slice(0, 3)]);
  return { options: all, correctIndex: all.indexOf(correct) };
}

// ============================================================
// TEMPLATE DEFINITIONS — 50+ templates across subjects
// ============================================================

interface TemplateResult {
  question: string;
  answer: number | string;
  explanation: string;
  diagramType: GeneratedQuestion['diagramType'];
  diagramData: Record<string, number>;
  signatureBase: string;
  isStringAnswer?: boolean;
  otherOptions?: string[];
  spread?: number;
}

type TemplateFn = () => TemplateResult;

// ---- MATEMATIKA SMP ----
const mathSMPTemplates: TemplateFn[] = [
  () => {
    const b = randInt(5, 20); const h = randInt(3, 15);
    const area = 0.5 * b * h;
    return { question: `Sebuah segitiga memiliki alas ${b} cm dan tinggi ${h} cm. Berapakah luas segitiga tersebut?`, answer: area, explanation: `Luas = ½ × alas × tinggi = ½ × ${b} × ${h} = ${area} cm²`, diagramType: 'triangle', diagramData: { base: b, height: h }, signatureBase: `mat-tri-b${b}-h${h}` };
  },
  () => {
    const l = randInt(4, 18); const w = randInt(3, 14);
    const area = l * w;
    return { question: `Sebuah persegi panjang memiliki panjang ${l} cm dan lebar ${w} cm. Berapakah luasnya?`, answer: area, explanation: `Luas = panjang × lebar = ${l} × ${w} = ${area} cm²`, diagramType: 'rectangle', diagramData: { length: l, width: w }, signatureBase: `mat-rect-l${l}-w${w}` };
  },
  () => {
    const r = randInt(3, 14);
    return { question: `Sebuah lingkaran memiliki jari-jari ${r} cm. Berapakah luasnya? (π = 3.14)`, answer: parseFloat((3.14 * r * r).toFixed(2)), explanation: `Luas = π × r² = 3.14 × ${r}² = ${(3.14 * r * r).toFixed(2)} cm²`, diagramType: 'circle', diagramData: { radius: r }, signatureBase: `mat-circ-r${r}` };
  },
  () => {
    const a = randInt(5, 15); const b = randInt(8, 22); const h = randInt(4, 12);
    const area = 0.5 * (a + b) * h;
    return { question: `Sebuah trapesium memiliki sisi sejajar ${a} cm dan ${b} cm, serta tinggi ${h} cm. Berapakah luasnya?`, answer: area, explanation: `Luas = ½ × (${a} + ${b}) × ${h} = ${area} cm²`, diagramType: 'trapezoid', diagramData: { topSide: a, bottomSide: b, height: h }, signatureBase: `mat-trap-a${a}-b${b}-h${h}` };
  },
  () => {
    const l = randInt(3, 12); const w = randInt(3, 12); const h2 = randInt(3, 12);
    const vol = l * w * h2;
    return { question: `Sebuah balok memiliki panjang ${l} cm, lebar ${w} cm, dan tinggi ${h2} cm. Berapakah volumenya?`, answer: vol, explanation: `Volume = p × l × t = ${l} × ${w} × ${h2} = ${vol} cm³`, diagramType: 'rectangle', diagramData: { length: l, width: w }, signatureBase: `mat-balok-${l}-${w}-${h2}` };
  },
  () => {
    const a = randInt(2, 20); const b = randInt(2, 20);
    return { question: `Berapakah hasil dari ${a} × ${b} + ${a}?`, answer: a * b + a, explanation: `${a} × ${b} + ${a} = ${a * b} + ${a} = ${a * b + a}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-arith-${a}-${b}` };
  },
  () => {
    const x = randInt(2, 10); const c = randInt(1, 20);
    const ans = x + c;
    return { question: `Jika x + ${c} = ${ans}, berapakah nilai x?`, answer: x, explanation: `x = ${ans} - ${c} = ${x}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-alg-x${x}-c${c}` };
  },
  () => {
    const s = randInt(3, 15);
    const p = 4 * s;
    return { question: `Sebuah persegi memiliki sisi ${s} cm. Berapakah kelilingnya?`, answer: p, explanation: `Keliling = 4 × sisi = 4 × ${s} = ${p} cm`, diagramType: 'rectangle', diagramData: { length: s, width: s }, signatureBase: `mat-sq-s${s}` };
  },
  () => {
    const n1 = randInt(10, 50); const n2 = randInt(10, 50);
    const gcd = (a2: number, b2: number): number => b2 === 0 ? a2 : gcd(b2, a2 % b2);
    const ans = gcd(n1, n2);
    return { question: `Berapakah FPB dari ${n1} dan ${n2}?`, answer: ans, explanation: `FPB(${n1}, ${n2}) = ${ans}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-fpb-${n1}-${n2}` };
  },
  () => {
    const pct = randInt(1, 9) * 10; const total = randInt(2, 10) * 100;
    const ans = (pct / 100) * total;
    return { question: `Berapakah ${pct}% dari ${total}?`, answer: ans, explanation: `${pct}% × ${total} = ${pct}/100 × ${total} = ${ans}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-pct-${pct}-${total}` };
  },
];

// ---- IPA SMP ----
const ipaSMPTemplates: TemplateFn[] = [
  () => {
    const m = randInt(2, 20); const a2 = randInt(1, 10);
    const f = m * a2;
    return { question: `Sebuah benda bermassa ${m} kg diberi percepatan ${a2} m/s². Berapakah gaya yang bekerja?`, answer: f, explanation: `F = m × a = ${m} × ${a2} = ${f} N`, diagramType: 'block-force', diagramData: { mass: m, force: f }, signatureBase: `ipa-newton-m${m}-a${a2}` };
  },
  () => {
    const v = randInt(10, 100); const t = randInt(1, 10);
    const s = v * t;
    return { question: `Sebuah mobil bergerak dengan kecepatan ${v} m/s selama ${t} detik. Berapakah jarak tempuhnya?`, answer: s, explanation: `s = v × t = ${v} × ${t} = ${s} m`, diagramType: 'none', diagramData: {}, signatureBase: `ipa-jarak-v${v}-t${t}` };
  },
  () => {
    const m = randInt(1, 15); const h = randInt(2, 20);
    const ep = m * 10 * h;
    return { question: `Benda bermassa ${m} kg berada di ketinggian ${h} m. Berapakah energi potensialnya? (g = 10 m/s²)`, answer: ep, explanation: `Ep = m × g × h = ${m} × 10 × ${h} = ${ep} J`, diagramType: 'block-force', diagramData: { mass: m, force: ep / 10 }, signatureBase: `ipa-ep-m${m}-h${h}` };
  },
  () => {
    const v2 = randInt(200, 400); const f2 = randInt(100, 1000);
    const wl = Math.round(v2 / f2 * 1000) / 1000;
    return { question: `Sebuah gelombang memiliki kecepatan ${v2} m/s dan frekuensi ${f2} Hz. Berapa panjang gelombangnya?`, answer: parseFloat(wl.toFixed(2)), explanation: `λ = v/f = ${v2}/${f2} = ${wl.toFixed(2)} m`, diagramType: 'none', diagramData: {}, signatureBase: `ipa-wave-v${v2}-f${f2}`, spread: 1 };
  },
  () => {
    const r = randInt(2, 20); const i = randInt(1, 10);
    const v3 = i * r;
    return { question: `Sebuah resistor ${r} Ω dialiri arus ${i} A. Berapakah tegangan listriknya?`, answer: v3, explanation: `V = I × R = ${i} × ${r} = ${v3} Volt`, diagramType: 'none', diagramData: {}, signatureBase: `ipa-ohm-r${r}-i${i}` };
  },
  () => {
    const m = randInt(1, 10); const dT = randInt(5, 50);
    const q = m * 4200 * dT;
    return { question: `Air bermassa ${m} kg dipanaskan dari 20°C hingga ${20 + dT}°C. Berapa kalor yang diperlukan? (c = 4200 J/kg°C)`, answer: q, explanation: `Q = m × c × ΔT = ${m} × 4200 × ${dT} = ${q} J`, diagramType: 'none', diagramData: {}, signatureBase: `ipa-kalor-m${m}-dT${dT}` };
  },
];

// ---- IPS SMP ----
const ipsSMPTemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Apa ibu kota Indonesia?', a: 'Jakarta', others: ['Surabaya', 'Bandung', 'Medan'] },
      { q: 'Pulau terbesar di Indonesia adalah?', a: 'Kalimantan', others: ['Sumatera', 'Jawa', 'Sulawesi'] },
      { q: 'Sungai terpanjang di Indonesia adalah?', a: 'Sungai Kapuas', others: ['Sungai Mahakam', 'Sungai Musi', 'Sungai Barito'] },
      { q: 'Gunung tertinggi di Indonesia adalah?', a: 'Puncak Jaya', others: ['Gunung Semeru', 'Gunung Rinjani', 'Gunung Kerinci'] },
      { q: 'Danau terbesar di Indonesia adalah?', a: 'Danau Toba', others: ['Danau Sentani', 'Danau Maninjau', 'Danau Singkarak'] },
      { q: 'Selat yang memisahkan Jawa dan Sumatera adalah?', a: 'Selat Sunda', others: ['Selat Malaka', 'Selat Bali', 'Selat Madura'] },
      { q: 'Proklamator kemerdekaan Indonesia adalah Soekarno dan?', a: 'Mohammad Hatta', others: ['Ahmad Yani', 'Sudirman', 'Tan Malaka'] },
      { q: 'Indonesia merdeka pada tanggal?', a: '17 Agustus 1945', others: ['1 Juni 1945', '10 November 1945', '28 Oktober 1928'] },
      { q: 'Mata uang resmi Indonesia adalah?', a: 'Rupiah', others: ['Ringgit', 'Baht', 'Dollar'] },
      { q: 'Organisasi pergerakan pertama di Indonesia adalah?', a: 'Budi Utomo', others: ['Sarekat Islam', 'Muhammadiyah', 'PNI'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban yang benar: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `ips-${t.a.replace(/\s/g, '')}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- MATEMATIKA SMA ----
const mathSMATemplates: TemplateFn[] = [
  () => {
    const a2 = randInt(1, 5); const b2 = randInt(-10, 10); const c2 = randInt(-20, 5);
    const disc = b2 * b2 - 4 * a2 * c2;
    return { question: `Tentukan diskriminan dari persamaan ${a2}x² + ${b2 >= 0 ? b2 : `(${b2})`}x + ${c2 >= 0 ? c2 : `(${c2})`} = 0`, answer: disc, explanation: `D = b² - 4ac = (${b2})² - 4(${a2})(${c2}) = ${b2 * b2} - ${4 * a2 * c2} = ${disc}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-disc-${a2}-${b2}-${c2}` };
  },
  () => {
    const n = randInt(3, 8); const a3 = randInt(1, 5); const d = randInt(1, 5);
    const sn = (n / 2) * (2 * a3 + (n - 1) * d);
    return { question: `Hitunglah jumlah ${n} suku pertama deret aritmatika dengan a = ${a3} dan b = ${d}!`, answer: sn, explanation: `Sn = n/2 × (2a + (n-1)b) = ${n}/2 × (2×${a3} + ${n - 1}×${d}) = ${sn}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-arit-n${n}-a${a3}-d${d}` };
  },
  () => {
    const b2 = randInt(5, 20); const h2 = randInt(3, 15);
    const area = 0.5 * b2 * h2;
    return { question: `Sebuah segitiga memiliki alas ${b2} cm dan tinggi ${h2} cm. Berapakah luas segitiga tersebut?`, answer: area, explanation: `Luas = ½ × ${b2} × ${h2} = ${area} cm²`, diagramType: 'triangle', diagramData: { base: b2, height: h2 }, signatureBase: `sma-tri-b${b2}-h${h2}` };
  },
  () => {
    const a4 = randInt(2, 6); const r = randInt(2, 4); const n2 = randInt(3, 6);
    const an = a4 * Math.pow(r, n2 - 1);
    return { question: `Suku ke-${n2} dari barisan geometri dengan a = ${a4} dan r = ${r} adalah?`, answer: an, explanation: `Un = a × r^(n-1) = ${a4} × ${r}^${n2 - 1} = ${an}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-geo-a${a4}-r${r}-n${n2}` };
  },
  () => {
    const x2 = randInt(1, 8);
    const ans = x2 * x2 * x2;
    return { question: `Berapakah nilai dari ${x2}³?`, answer: ans, explanation: `${x2}³ = ${x2} × ${x2} × ${x2} = ${ans}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-cube-${x2}` };
  },
  () => {
    const base = randInt(2, 5); const exp = randInt(2, 6);
    const logVal = exp;
    return { question: `Berapakah log basis ${base} dari ${Math.pow(base, exp)}?`, answer: logVal, explanation: `log_${base}(${Math.pow(base, exp)}) = ${exp}, karena ${base}^${exp} = ${Math.pow(base, exp)}`, diagramType: 'none', diagramData: {}, signatureBase: `mat-log-b${base}-e${exp}` };
  },
];

// ---- FISIKA SMA ----
const fisikaSMATemplates: TemplateFn[] = [
  () => {
    const m = randInt(2, 30); const a5 = randInt(1, 15);
    const f = m * a5;
    return { question: `Sebuah benda bermassa ${m} kg diberi percepatan ${a5} m/s². Berapakah gaya yang bekerja pada benda?`, answer: f, explanation: `Hukum Newton II: F = m × a = ${m} × ${a5} = ${f} N`, diagramType: 'block-force', diagramData: { mass: m, force: f }, signatureBase: `fis-newton-m${m}-a${a5}` };
  },
  () => {
    const v0 = randInt(0, 20); const a6 = randInt(1, 10); const t = randInt(1, 10);
    const v = v0 + a6 * t;
    return { question: `Benda bergerak dengan v₀ = ${v0} m/s, a = ${a6} m/s², selama t = ${t} s. Berapa kecepatan akhirnya?`, answer: v, explanation: `v = v₀ + at = ${v0} + ${a6}×${t} = ${v} m/s`, diagramType: 'none', diagramData: {}, signatureBase: `fis-glbb-v${v0}-a${a6}-t${t}` };
  },
  () => {
    const m = randInt(1, 20); const v2 = randInt(2, 15);
    const ek = 0.5 * m * v2 * v2;
    return { question: `Benda bermassa ${m} kg bergerak dengan kecepatan ${v2} m/s. Berapa energi kinetiknya?`, answer: ek, explanation: `Ek = ½mv² = ½ × ${m} × ${v2}² = ${ek} J`, diagramType: 'block-force', diagramData: { mass: m, force: v2 }, signatureBase: `fis-ek-m${m}-v${v2}` };
  },
  () => {
    const m1 = randInt(1, 10); const m2 = randInt(1, 10); const r = randInt(1, 5);
    const f2 = Math.round(667 * m1 * m2 / (r * r));
    return { question: `Dua benda bermassa ${m1} kg dan ${m2} kg berjarak ${r} m. Berapa gaya gravitasi? (G = 6.67 × 10⁻¹¹, jawab dalam ×10⁻¹¹ N)`, answer: f2, explanation: `F = G×m₁×m₂/r² = 6.67×10⁻¹¹ × ${m1} × ${m2} / ${r}² = ${f2} × 10⁻¹¹ N`, diagramType: 'none', diagramData: {}, signatureBase: `fis-grav-${m1}-${m2}-${r}` };
  },
  () => {
    const p = randInt(100, 1000); const a7 = randInt(1, 20);
    const f3 = p * a7;
    return { question: `Tekanan ${p} Pa bekerja pada luas ${a7} m². Berapa gayanya?`, answer: f3, explanation: `F = P × A = ${p} × ${a7} = ${f3} N`, diagramType: 'none', diagramData: {}, signatureBase: `fis-tekanan-${p}-${a7}` };
  },
  () => {
    const w = randInt(100, 2000); const s = randInt(1, 20);
    const p2 = w * s;
    return { question: `Gaya ${w} N memindahkan benda sejauh ${s} m. Berapa usahanya?`, answer: p2, explanation: `W = F × s = ${w} × ${s} = ${p2} J`, diagramType: 'block-force', diagramData: { mass: Math.round(w / 10), force: w }, signatureBase: `fis-usaha-${w}-${s}` };
  },
];

// ---- KIMIA SMA ----
const kimiaSMATemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Berapa nomor atom Karbon?', a: '6', others: ['8', '12', '14'] },
      { q: 'Berapa nomor atom Oksigen?', a: '8', others: ['6', '16', '10'] },
      { q: 'Apa rumus kimia air?', a: 'H₂O', others: ['CO₂', 'NaCl', 'H₂SO₄'] },
      { q: 'Apa rumus kimia garam dapur?', a: 'NaCl', others: ['KCl', 'CaCl₂', 'MgCl₂'] },
      { q: 'Gas mulia yang paling ringan adalah?', a: 'Helium', others: ['Neon', 'Argon', 'Kripton'] },
      { q: 'pH larutan netral adalah?', a: '7', others: ['0', '14', '1'] },
      { q: 'Unsur dengan simbol Fe adalah?', a: 'Besi', others: ['Emas', 'Perak', 'Tembaga'] },
      { q: 'Berapa jumlah elektron valensi Natrium (Na)?', a: '1', others: ['2', '3', '7'] },
      { q: 'Ikatan antara logam dan non-logam disebut ikatan?', a: 'Ionik', others: ['Kovalen', 'Logam', 'Hidrogen'] },
      { q: 'Reaksi yang melepas panas disebut reaksi?', a: 'Eksoterm', others: ['Endoterm', 'Redoks', 'Substitusi'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `kim-${t.a.replace(/[^a-zA-Z0-9]/g, '')}`, isStringAnswer: true, otherOptions: t.others };
  },
  () => {
    const mol = randInt(1, 10);
    const mass = mol * 18;
    return { question: `Berapa gram massa ${mol} mol air (H₂O)? (Mr H₂O = 18)`, answer: mass, explanation: `m = n × Mr = ${mol} × 18 = ${mass} gram`, diagramType: 'none', diagramData: {}, signatureBase: `kim-mol-${mol}` };
  },
];

// ---- BIOLOGI SMA ----
const biologiSMATemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Organel sel yang berfungsi sebagai pembangkit energi adalah?', a: 'Mitokondria', others: ['Ribosom', 'Lisosom', 'Nukleus'] },
      { q: 'Proses pembelahan sel secara mitosis menghasilkan?', a: '2 sel anak identik', others: ['4 sel anak', '1 sel besar', '8 sel anak'] },
      { q: 'Fotosintesis terjadi di organel?', a: 'Kloroplas', others: ['Mitokondria', 'Ribosom', 'Vakuola'] },
      { q: 'DNA terletak di bagian sel yang disebut?', a: 'Nukleus', others: ['Sitoplasma', 'Membran sel', 'Retikulum Endoplasma'] },
      { q: 'Hewan yang berkembang biak dengan bertelur disebut?', a: 'Ovipar', others: ['Vivipar', 'Ovovivipar', 'Vegetatif'] },
      { q: 'Sistem peredaran darah manusia bersifat?', a: 'Tertutup', others: ['Terbuka', 'Tunggal', 'Sederhana'] },
      { q: 'Hormon insulin diproduksi oleh?', a: 'Pankreas', others: ['Hati', 'Ginjal', 'Tiroid'] },
      { q: 'Jumlah kromosom manusia normal adalah?', a: '46', others: ['23', '44', '48'] },
      { q: 'Vitamin yang larut dalam lemak adalah?', a: 'Vitamin A, D, E, K', others: ['Vitamin B, C', 'Vitamin B saja', 'Vitamin C saja'] },
      { q: 'Enzim pencernaan yang terdapat di mulut adalah?', a: 'Amilase', others: ['Pepsin', 'Tripsin', 'Lipase'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `bio-${t.a.replace(/[^a-zA-Z0-9]/g, '')}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- INFORMATIKA SMA ----
const informatikaSMATemplates: TemplateFn[] = [
  () => {
    const n = randInt(1, 255);
    const bin = n.toString(2);
    return { question: `Konversikan bilangan desimal ${n} ke biner!`, answer: bin, explanation: `${n} dalam biner = ${bin}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `inf-bin-${n}`, isStringAnswer: true, otherOptions: [randInt(1, 255).toString(2), randInt(1, 255).toString(2), randInt(1, 255).toString(2)] };
  },
  () => {
    const topics = [
      { q: 'Bahasa pemrograman yang dikembangkan oleh Google untuk web adalah?', a: 'Dart', others: ['Swift', 'Kotlin', 'Ruby'] },
      { q: 'Struktur data LIFO (Last In First Out) disebut?', a: 'Stack', others: ['Queue', 'Array', 'Tree'] },
      { q: 'Apa singkatan dari HTML?', a: 'HyperText Markup Language', others: ['High Tech Machine Learning', 'Hyper Transfer Mode Link', 'Home Tool Markup Language'] },
      { q: 'Berapa bit dalam 1 byte?', a: '8', others: ['4', '16', '32'] },
      { q: 'Algoritma pengurutan yang membandingkan elemen berdekatan disebut?', a: 'Bubble Sort', others: ['Quick Sort', 'Merge Sort', 'Heap Sort'] },
      { q: 'Apa itu IP Address?', a: 'Alamat unik perangkat di jaringan', others: ['Nama domain website', 'Password jaringan', 'Kecepatan internet'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `inf-${t.a.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- ASTRONOMI SMA ----
const astronomiSMATemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Planet terbesar di tata surya adalah?', a: 'Jupiter', others: ['Saturnus', 'Uranus', 'Neptunus'] },
      { q: 'Bintang terdekat dari Bumi selain Matahari adalah?', a: 'Proxima Centauri', others: ['Sirius', 'Alpha Centauri A', 'Betelgeuse'] },
      { q: 'Galaksi tempat tinggal kita disebut?', a: 'Bima Sakti', others: ['Andromeda', 'Triangulum', 'Sombrero'] },
      { q: 'Planet yang memiliki cincin paling terlihat adalah?', a: 'Saturnus', others: ['Jupiter', 'Uranus', 'Neptunus'] },
      { q: 'Fenomena gerhana matahari terjadi ketika?', a: 'Bulan berada di antara Bumi dan Matahari', others: ['Bumi berada di antara Bulan dan Matahari', 'Matahari berada di antara Bumi dan Bulan', 'Planet lain menghalangi'] },
      { q: 'Satuan jarak yang digunakan untuk mengukur jarak bintang adalah?', a: 'Tahun cahaya', others: ['Kilometer', 'Mil', 'Meter'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `astro-${t.a.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- EKONOMI SMA ----
const ekonomiSMATemplates: TemplateFn[] = [
  () => {
    const price = randInt(5, 50) * 1000; const qty = randInt(10, 100);
    const rev = price * qty;
    return { question: `Sebuah toko menjual barang seharga Rp${price.toLocaleString()} per unit, terjual ${qty} unit. Berapa total pendapatan?`, answer: rev, explanation: `Total = harga × jumlah = Rp${price.toLocaleString()} × ${qty} = Rp${rev.toLocaleString()}`, diagramType: 'none', diagramData: {}, signatureBase: `eko-rev-${price}-${qty}` };
  },
  () => {
    const topics = [
      { q: 'Hukum permintaan menyatakan bahwa jika harga naik maka?', a: 'Permintaan turun', others: ['Permintaan naik', 'Permintaan tetap', 'Penawaran turun'] },
      { q: 'Bank sentral Indonesia adalah?', a: 'Bank Indonesia', others: ['Bank BRI', 'Bank Mandiri', 'OJK'] },
      { q: 'GDP adalah singkatan dari?', a: 'Gross Domestic Product', others: ['General Development Plan', 'Growth Domestic Percentage', 'Grand Domestic Price'] },
      { q: 'Inflasi adalah?', a: 'Kenaikan harga secara umum', others: ['Penurunan harga', 'Kenaikan produksi', 'Penurunan pendapatan'] },
      { q: 'Pajak yang dikenakan pada barang dan jasa disebut?', a: 'PPN', others: ['PPh', 'PBB', 'Cukai'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `eko-${t.a.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- KEBUMIAN SMA ----
const kebumianSMATemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Lapisan Bumi yang paling tebal adalah?', a: 'Mantel', others: ['Kerak', 'Inti luar', 'Inti dalam'] },
      { q: 'Skala yang digunakan untuk mengukur kekuatan gempa adalah?', a: 'Skala Richter', others: ['Skala Beaufort', 'Skala Mohs', 'Skala Celsius'] },
      { q: 'Batuan yang terbentuk dari magma yang membeku disebut batuan?', a: 'Beku', others: ['Sedimen', 'Metamorf', 'Mineral'] },
      { q: 'Lapisan atmosfer tempat cuaca terjadi adalah?', a: 'Troposfer', others: ['Stratosfer', 'Mesosfer', 'Termosfer'] },
      { q: 'Apa yang menyebabkan terjadinya tsunami?', a: 'Gempa bawah laut', others: ['Angin kencang', 'Hujan lebat', 'Erupsi gunung'] },
      { q: 'Mineral dengan kekerasan tertinggi pada skala Mohs adalah?', a: 'Berlian', others: ['Kuarsa', 'Topaz', 'Korundum'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `kbm-${t.a.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`, isStringAnswer: true, otherOptions: t.others };
  },
];

// ---- GEOGRAFI SMA ----
const geografiSMATemplates: TemplateFn[] = [
  () => {
    const topics = [
      { q: 'Garis khayal yang membagi Bumi menjadi belahan utara dan selatan adalah?', a: 'Garis Khatulistiwa', others: ['Garis Bujur', 'Garis Wallace', 'Garis Weber'] },
      { q: 'Benua terluas di dunia adalah?', a: 'Asia', others: ['Afrika', 'Amerika', 'Eropa'] },
      { q: 'Samudra terluas di dunia adalah?', a: 'Samudra Pasifik', others: ['Samudra Atlantik', 'Samudra Hindia', 'Samudra Arktik'] },
      { q: 'Negara dengan penduduk terbanyak di dunia adalah?', a: 'India', others: ['China', 'Amerika Serikat', 'Indonesia'] },
      { q: 'Iklim Indonesia termasuk iklim?', a: 'Tropis', others: ['Subtropis', 'Sedang', 'Kutub'] },
      { q: 'Angin muson barat membawa?', a: 'Musim hujan', others: ['Musim kemarau', 'Musim semi', 'Musim gugur'] },
    ];
    const t = topics[randInt(0, topics.length - 1)];
    return { question: t.q, answer: t.a, explanation: `Jawaban: ${t.a}`, diagramType: 'none' as const, diagramData: {}, signatureBase: `geo-${t.a.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`, isStringAnswer: true, otherOptions: t.others };
  },
];


// ============================================================
// TEMPLATE REGISTRY
// ============================================================
const templateRegistry: Record<string, TemplateFn[]> = {
  'SMP-Matematika': mathSMPTemplates,
  'SMP-IPA': ipaSMPTemplates,
  'SMP-IPS': ipsSMPTemplates,
  'SMA-Matematika': mathSMATemplates,
  'SMA-Fisika': fisikaSMATemplates,
  'SMA-Kimia': kimiaSMATemplates,
  'SMA-Biologi': biologiSMATemplates,
  'SMA-Informatika': informatikaSMATemplates,
  'SMA-Astronomi': astronomiSMATemplates,
  'SMA-Ekonomi': ekonomiSMATemplates,
  'SMA-Kebumian': kebumianSMATemplates,
  'SMA-Geografi': geografiSMATemplates,
};

// ============================================================
// MAIN GENERATOR
// ============================================================
export function generateQuestion(level: Level, subject: Subject): GeneratedQuestion {
  const key = `${level}-${subject}`;
  const templates = templateRegistry[key];
  if (!templates || templates.length === 0) {
    // Fallback to math
    const fb = mathSMPTemplates[0]();
    return buildQuestion(fb, level, subject);
  }
  const template = templates[randInt(0, templates.length - 1)];
  const result = template();
  return buildQuestion(result, level, subject);
}

function buildQuestion(result: TemplateResult, level: Level, subject: Subject): GeneratedQuestion {
  let opts: { options: string[]; correctIndex: number };

  if (result.isStringAnswer && result.otherOptions) {
    opts = makeOptionsStr(result.answer as string, result.otherOptions);
  } else {
    opts = makeOptions(result.answer as number, result.spread);
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signature: result.signatureBase,
    subject,
    level,
    question: result.question,
    options: opts.options,
    correctIndex: opts.correctIndex,
    explanation: result.explanation,
    diagramType: result.diagramType,
    diagramData: result.diagramData,
  };
}

export function generateQuestionBatch(
  level: Level,
  subject: Subject,
  count: number = 5,
  usedSignatures: Set<string> = new Set()
): { questions: GeneratedQuestion[]; mastery: boolean } {
  const questions: GeneratedQuestion[] = [];
  const localSigs = new Set(usedSignatures);
  let maxAttempts = count * 50;
  let mastery = false;

  while (questions.length < count && maxAttempts > 0) {
    maxAttempts--;
    const q = generateQuestion(level, subject);
    if (!localSigs.has(q.signature)) {
      localSigs.add(q.signature);
      questions.push(q);
    }
  }

  if (questions.length < count) {
    mastery = true;
    // Fill remaining with whatever we can
    while (questions.length < count) {
      const q = generateQuestion(level, subject);
      q.signature = `${q.signature}-dup-${Date.now()}`;
      questions.push(q);
    }
  }

  return { questions, mastery };
}
