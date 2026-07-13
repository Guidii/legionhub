import Link from "next/link";

const features = [
  {
    title: "Legion Coach",
    description:
      "Informe sua wave, gold, lumber e roll para receber uma recomendação explicada.",
    status: "Em desenvolvimento",
  },
  {
    title: "Unidades",
    description:
      "Consulte atributos, custos, upgrades, habilidades e relações entre unidades.",
    status: "Dados extraídos",
  },
  {
    title: "Waves",
    description:
      "Entenda os perigos de cada wave e quais composições costumam se sair melhor.",
    status: "Em breve",
  },
];

const stats = [
  { value: "838", label: "objetos de unidades extraídos" },
  { value: "971", label: "habilidades encontradas" },
  { value: "16", label: "builders identificados" },
  { value: "11.4b", label: "versão inicial suportada" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xl font-black tracking-tight">
              LEGION<span className="text-cyan-400">HUB</span>
            </p>
            <p className="text-xs text-slate-500">
              Competitive Legion TD platform
            </p>
          </div>

          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Pré-alpha
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
            Warcraft III · Team OZE
          </p>

          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight sm:text-6xl">
            Tome decisões melhores em cada wave.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            O LegionHub transforma dados reais do Legion TD em informações,
            comparações e recomendações para ajudar você a evoluir no Ranked
            4x4.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <button
              type="button"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Abrir Legion Coach
            </button>

            <Link
              href="/unidades"
              className="rounded-xl border border-white/15 px-6 py-3 font-bold text-white transition hover:border-white/30 hover:bg-white/5"
            >
              Explorar unidades
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-600">
            As ferramentas interativas serão ativadas nas próximas entregas.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-bold">Legion Coach</p>
              <p className="text-sm text-slate-500">Prévia da análise</p>
            </div>

            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Baseado em dados
            </span>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Situação
              </p>
              <p className="mt-2 font-semibold">
                Wave 6 · 280 gold · 6 wisps
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-400">
                Recomendação
              </p>
              <p className="mt-2 text-lg font-bold">
                Evoluir Frost Wolf para Pandaren
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                O upgrade aumenta seu valor de combate imediato antes da
                próxima wave perigosa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-xs text-slate-500">Risco</p>
                <p className="mt-1 font-bold text-amber-300">Moderado</p>
              </div>

              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-xs text-slate-500">Confiança</p>
                <p className="mt-1 font-bold text-emerald-300">Média</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-6 py-10 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-5">
              <p className="text-3xl font-black text-cyan-400">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
            Plataforma
          </p>
          <h2 className="mt-3 text-3xl font-black">
            Conhecimento transformado em decisão
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-cyan-400/30"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {feature.status}
              </span>
              <h3 className="mt-4 text-xl font-bold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:justify-between">
          <p>LegionHub · Projeto open source</p>
          <p>Team OZE 11.4b-beta1 · Battle.net Ranked 4x4</p>
        </div>
      </footer>
    </main>
  );
}