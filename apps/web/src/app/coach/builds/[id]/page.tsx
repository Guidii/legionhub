import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitIcon } from "@/components/unit-icon";
import {
  getBuildById,
  getBuildCatalog,
  type BuildDifficulty,
  type BuildStatus,
} from "@/lib/build-catalog";
import { getFighters } from "@/lib/legion-data";
import {
  getStrategyByBuildId,
  type Strategy,
  type StrategyContentStatus,
} from "@/lib/strategy-catalog";
import { getUnitIconPaths } from "@/lib/unit-icons";

type BuildPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const builds = await getBuildCatalog();
  return builds.map((build) => ({ id: build.id }));
}

export default async function BuildPage({ params }: BuildPageProps) {
  const { id } = await params;
  const [build, fighters, strategy] = await Promise.all([
    getBuildById(id),
    getFighters(),
    getStrategyByBuildId(id),
  ]);

  if (!build) notFound();

  const buildRawcodes = [
    ...build.requiredUnitRawcodes,
    ...build.optionalUnitRawcodes,
  ];
  const iconPaths = await getUnitIconPaths(buildRawcodes);
  const fighterByRawcode = new Map(
    fighters.map((fighter) => [fighter.rawcode, fighter]),
  );

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/coach"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          ← Voltar para o Coach
        </Link>

        <header className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
                Build Planner
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">
                {build.title}
              </h1>
              <p className="mt-4 leading-7 text-slate-400">
                {build.shortDescription}
              </p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-200">
              {formatStatus(build.status)}
            </span>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Dificuldade"
              value={formatDifficulty(build.difficulty)}
            />
            <InfoCard label="Status" value={formatStatus(build.status)} />
          </dl>

          <section className="mt-8 border-t border-white/10 pt-7">
            <h2 className="text-lg font-black">Modos compatíveis</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {build.compatibleModes.map((mode) => (
                <span
                  key={mode}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-mono text-sm font-bold text-cyan-200"
                >
                  {mode}
                </span>
              ))}
            </div>
          </section>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <UnitSection
            title="Unidades obrigatórias"
            rawcodes={build.requiredUnitRawcodes}
            fighterByRawcode={fighterByRawcode}
            iconPaths={iconPaths}
          />
          <UnitSection
            title="Unidades opcionais"
            rawcodes={build.optionalUnitRawcodes}
            fighterByRawcode={fighterByRawcode}
            iconPaths={iconPaths}
          />
        </div>

        {strategy ? (
          <StrategyDetails strategy={strategy} />
        ) : (
          <section className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">
            Nenhuma Strategy cadastrada para esta build.
          </section>
        )}
      </div>
    </main>
  );
}

function UnitSection({
  title,
  rawcodes,
  fighterByRawcode,
  iconPaths,
}: {
  title: string;
  rawcodes: string[];
  fighterByRawcode: Map<string, Awaited<ReturnType<typeof getFighters>>[number]>;
  iconPaths: Record<string, string | null>;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {rawcodes.map((rawcode) => {
          const fighter = fighterByRawcode.get(rawcode);
          const name = fighter?.name ?? rawcode;

          return (
            <div
              key={rawcode}
              className="flex items-center gap-3 rounded-xl bg-black/20 p-3"
            >
              <UnitIcon
                rawcode={rawcode}
                name={name}
                webPath={iconPaths[rawcode] ?? null}
                size={48}
              />
              <div>
                <p className="font-bold">{name}</p>
                <p className="font-mono text-xs text-slate-500">{rawcode}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 font-bold">{value}</dd>
    </div>
  );
}

function StrategyDetails({ strategy }: { strategy: Strategy }) {
  return (
    <section className="mt-8 space-y-6">
      <header className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.05] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
          Strategy
        </p>
        <h2 className="mt-2 text-2xl font-black">{strategy.title}</h2>
        <p className="mt-3 leading-7 text-slate-400">{strategy.description}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <StrategySection title="Build Order">
          <div className="space-y-4">
            {strategy.buildOrder.map((wave) => (
              <WaveCard
                key={wave.wave}
                wave={wave.wave}
                status={wave.status}
                items={wave.steps}
                note={wave.observation}
              />
            ))}
          </div>
        </StrategySection>

        <StrategySection title="Economia">
          <div className="space-y-4">
            {strategy.economy.map((wave) => (
              <WaveCard
                key={wave.wave}
                wave={wave.wave}
                status={wave.status}
                items={wave.actions}
              />
            ))}
          </div>
        </StrategySection>
      </div>

      <StrategySection title="Posicionamento">
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
          <p>Formato: {strategy.positioning.format}</p>
          <p className="mt-2">
            Grid: {strategy.positioning.rows ?? "?"} linhas ×{" "}
            {strategy.positioning.columns ?? "?"} colunas
          </p>
          <p className="mt-2">
            Posições cadastradas: {strategy.positioning.units.length}
          </p>
          {strategy.positioning.notes && (
            <p className="mt-3 text-amber-100/70">
              {strategy.positioning.notes}
            </p>
          )}
        </div>
      </StrategySection>

      <div className="grid gap-5 lg:grid-cols-3">
        <AssessmentSection
          title="Power Spikes"
          assessments={strategy.powerSpikes}
        />
        <AssessmentSection
          title="Weak Waves"
          assessments={strategy.weakWaves}
        />
        <StrategySection title="Recommended Sends">
          <div className="space-y-3">
            {strategy.recommendedSends.map((range, index) => (
              <div key={`${range.fromWave}-${range.toWave}-${index}`}>
                <StatusBadge status={range.status} />
                <p className="mt-2 text-sm font-bold">
                  Waves {range.fromWave ?? "?"}–{range.toWave ?? "?"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {range.sendRawcodes.length
                    ? range.sendRawcodes.join(", ")
                    : range.notes ?? "Nenhum send cadastrado."}
                </p>
              </div>
            ))}
          </div>
        </StrategySection>
      </div>

      <StrategySection title="Notas">
        <p className="leading-7 text-slate-400">{strategy.notes}</p>
      </StrategySection>

      <StrategySection title="Evidências e fatos observados">
        <p className="mb-4 text-xs leading-5 text-slate-500">
          Esta referência documenta um fato observado e não valida,
          isoladamente, as recomendações desta Strategy.
        </p>
        {strategy.references.length > 0 ? (
          <div className="space-y-4">
            {strategy.references.map((reference, index) => (
              <article
                key={`${reference.observationSessionId}-${reference.wave}-${index}`}
                className="rounded-xl bg-black/20 p-4"
              >
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <EvidenceItem
                    label="Sessão"
                    value={reference.observationSessionId}
                  />
                  <EvidenceItem
                    label="Wave"
                    value={String(reference.wave)}
                  />
                  <EvidenceItem
                    label="Descrição"
                    value={reference.description}
                  />
                  <EvidenceItem
                    label="Status"
                    value={
                      reference.status === "observed"
                        ? "Observada"
                        : reference.status === "linked"
                          ? "Vinculada"
                          : "Validação pendente"
                    }
                  />
                </dl>
                <p className="mt-4 border-t border-white/5 pt-4 text-xs text-slate-500">
                  Settlement: {reference.settlement?.waveObservationId ?? "—"}
                  {" · "}Snapshot: {reference.snapshotId ?? "—"}
                </p>
                {reference.notes && (
                  <p className="mt-2 text-sm text-slate-400">
                    {reference.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            Nenhuma evidência vinculada a esta Strategy.
          </p>
        )}
      </StrategySection>
    </section>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function StrategySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-xl font-black">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function WaveCard({
  wave,
  status,
  items,
  note,
}: {
  wave: number;
  status: StrategyContentStatus;
  items: string[];
  note?: string | null;
}) {
  return (
    <article className="rounded-xl bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black">Wave {wave}</h4>
        <StatusBadge status={status} />
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-400">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

function AssessmentSection({
  title,
  assessments,
}: {
  title: string;
  assessments: Strategy["powerSpikes"];
}) {
  return (
    <StrategySection title={title}>
      <div className="space-y-3">
        {assessments.map((assessment, index) => (
          <div key={`${assessment.wave}-${index}`}>
            <StatusBadge status={assessment.status} />
            <p className="mt-2 text-sm font-bold">
              {assessment.wave === null
                ? "Wave a confirmar"
                : `Wave ${assessment.wave}`}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {assessment.description}
            </p>
          </div>
        ))}
      </div>
    </StrategySection>
  );
}

function StatusBadge({ status }: { status: StrategyContentStatus }) {
  const label =
    status === "placeholder"
      ? "Placeholder"
      : status === "draft"
        ? "Rascunho"
        : "Validado";

  return (
    <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
      {label}
    </span>
  );
}

function formatDifficulty(difficulty: BuildDifficulty) {
  const labels: Record<BuildDifficulty, string> = {
    "not-rated": "Não avaliada",
    easy: "⭐ Fácil",
    medium: "⭐⭐ Médio",
    hard: "⭐⭐⭐ Difícil",
  };
  return labels[difficulty];
}

function formatStatus(status: BuildStatus) {
  const labels: Record<BuildStatus, string> = {
    experimental: "Experimental",
    validated: "Validada",
    testing: "Em teste",
    archived: "Arquivada",
  };
  return labels[status];
}
