import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllFighters } from "@/lib/legion-data";
import { createUnitSlug } from "@/lib/unit-slug";

type UnitPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

export default async function UnitPage({ params }: UnitPageProps) {
    const { slug } = await params;
    const units = await getAllFighters();

    const unit = units.find(
        (fighter) => createUnitSlug(fighter.name, fighter.rawcode) === slug,
    );

    if (!unit) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#070b14] text-white">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <Link
                    href="/unidades"
                    className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                >
                    ← Voltar para unidades
                </Link>

                <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
                                {unit.rawcode}
                            </p>

                            <h1 className="mt-2 text-4xl font-black">
                                {unit.name}
                            </h1>

                            <p className="mt-3 text-slate-400">
                                Dados extraídos diretamente do mapa Legion TD 11.4b-beta1.
                            </p>
                        </div>

                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3">
                            <p className="text-xs font-bold uppercase text-yellow-500">
                                Gold
                            </p>
                            <p className="text-2xl font-black text-yellow-300">
                                {unit.gold}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Stat label="HP" value={unit.hp} />
                        <Stat
                            label="Dano"
                            value={
                                unit.damageMin !== null && unit.damageMax !== null
                                    ? `${unit.damageMin}–${unit.damageMax}`
                                    : "—"
                            }
                        />
                        <Stat label="Alcance" value={unit.range} />
                        <Stat label="Tipo de ataque" value={unit.attackType} />
                        <Stat label="Tipo de defesa" value={unit.defenseType} />
                        <Stat label="Builders" value={unit.builders.join(", ") || "—"} />
                    </div>

                    {unit.abilities.length > 0 && (
                        <section className="mt-10 border-t border-white/10 pt-8">
                            <h2 className="text-xl font-black">Habilidades</h2>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {[...new Set(unit.abilities)].map((ability) => (
                                    <span
                                        key={`${unit.rawcode}-${ability}`}
                                        className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-sm text-purple-200"
                                    >
                                        {ability}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {unit.upgrades.length > 0 && (
                        <section className="mt-10 border-t border-white/10 pt-8">
                            <h2 className="text-xl font-black">Upgrades diretos</h2>

                            <div className="mt-4 space-y-3">
                                {unit.upgrades.map((upgrade) => (
                                    <Link
                                        key={upgrade.rawcode}
                                        href={`/unidades/${createUnitSlug(upgrade.name, upgrade.rawcode)}`}
                                        className="flex items-center justify-between rounded-xl bg-cyan-400/5 px-3 py-2"
                                    >
                                        <span className="font-semibold text-cyan-100">
                                            {upgrade.name}
                                        </span>
                                        <span className="text-sm text-cyan-300">
                                            {upgrade.upgradeGoldCost == null
                                                ? "Custo a confirmar"
                                                : `+${upgrade.upgradeGoldCost} gold`}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </section>
            </div>
        </main>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: string | number | null;
}) {
    return (
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {label}
            </p>
            <p className="mt-2 font-bold text-white">
                {value ?? "—"}
            </p>
        </div>
    );
}