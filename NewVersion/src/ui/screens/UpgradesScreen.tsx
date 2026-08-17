/**
 * The shop — `ScreenUpgrades.as`.
 *
 * Renders from `shop`, which `UpgradesScene` publishes. Every figure here is
 * precomputed: cost, affordability and the level cap all come from
 * `upgradeState`, so the 1173 balance values have exactly one interpreter and
 * this component does no game arithmetic.
 *
 * Clicking emits an id; the scene owns the transaction.
 *
 * ── T166: a grid of tiles and one detail window ───────────────────────────
 * This replaced 28 full-width rows, each carrying its own name, stat lines,
 * equip controls, level meter and buy button. That could not fit on a screen
 * and never tried to — it scrolled.
 *
 * **The layout it replaced them with is the original's, which is the part
 * worth knowing before changing it back.** `ScreenUpgrades.as` lays the
 * upgrades out as *icon buttons on a 36px pitch, six to a row* (`:440-467`)
 * and puts everything else in a single right-hand window pinned at
 * `bgWindow.x = 640 - bgWindow.width`: the balance, the name, the level, the
 * price and `infoText1`-`5` all address whichever tile is selected
 * (`:582-590`). There is one `selectedWeapon` / `selectedSecondary` /
 * `selectedMisc` at a time (`:192`, `:746`).
 *
 * So the scroll-free requirement and the faithful layout turned out to be the
 * same change. 28 tiles fit on any screen because a tile is an icon; 28 rows
 * never could, because a row is a paragraph.
 *
 * Two consequences, both deliberate:
 *
 *   - **Selection is local React state, not a store field.** It is view state
 *     with no gameplay meaning — nothing in the scene reads it and nothing
 *     persists it — so putting it on the bus would add a round trip and a
 *     second place for it to be stale. It survives a republished catalogue
 *     because it is keyed by `id` rather than by index.
 *   - **The detail window draws no icon**, which is not an omission: the AS3's
 *     window holds text and buttons only, because the tile *is* the picture.
 *     It also keeps the rendered layer count equal to the catalogue's, which
 *     is what the tile-art tests count.
 *
 * ── The one thing in that window still missing ────────────────────────────
 * `iconDamageType`, the small clip beside the red damage-type line
 * (`:1772` and its siblings drive it to nine frames). The *text* is ported —
 * `damageTypeLabel` transcribes the AS3's own lookup — but the icon is not
 * extracted, so the line renders without it.
 */
import { Fragment, useState } from 'react';

import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { formatNumber } from '../../game/core/Functions';
import { useInfoText } from '../useInfoText';
import { LevelGuideWidget } from '../LevelGuideWidget';
import { UpgradeIcon } from '../UpgradeIcon';
import { siteCorner } from '../../game/ui/infoTextSites';
import { UPGRADE_DESCRIPTIONS } from '../../game/upgrades/upgradeDescriptionData';
import { damageTypeLabel } from '../../game/upgrades/damageTypeLabel';

/**
 * The original's own headings — `ScreenUpgrades` labels the three plates
 * `PRIMARY WEAPONS`, `SPECIAL WEAPONS` and `MISCELLANEOUS`. The port had
 * shortened the last two to "Specials" and "Tank"; restored in T166, and
 * uppercased in CSS rather than here so the accessible name stays sentence
 * case for a screen reader.
 */
const CATEGORY_LABELS: Record<string, string> = {
  primary: 'Primary weapons',
  secondary: 'Special weapons',
  misc: 'Miscellaneous',
};

/** Display order — weapons first, since they are what money is usually for. */
const CATEGORY_ORDER = ['primary', 'secondary', 'misc'];

/** DEV-AID: top-up, so the 28-upgrade catalogue can be exercised. */
const DEV_GRANT = 200_000;

type ShopRow = NonNullable<ReturnType<typeof useShop>>['upgrades'][number];

/**
 * `"Damage: 7 HP  7.33"` -> `['Damage:', '7 HP  7.33']`.
 *
 * The AS3 emphasises the same halves rather than colouring the whole line: it
 * writes the label and figure into one field and then re-formats the tail with
 * `textFormatGreen` (`:828-831`, `:837-840`), so the colon is the boundary
 * there too.
 *
 * **The whole line is the label when there is no colon**, which is a real case
 * rather than defensiveness — `upgradePreviewData` carries bare lines — and
 * the alternative is a stat rendered as an empty white label beside a green
 * sentence.
 */
function splitStat(line: string): [string, string | null] {
  const at = line.indexOf(':');
  if (at === -1) return [line, null];
  return [line.slice(0, at + 1), line.slice(at + 1).trim()];
}

function useShop() {
  return useGameStore((s) => s.shop);
}

/**
 * The equip controls — `ButtonEquipSlot` (two, primaries) and `ButtonEquip`
 * (one, secondaries).
 *
 * Shown only on an owned row, because the AS3 adds them inside
 * `if (levelsArray[selectedWeapon - 1] != 0)` and shows the Buy button
 * otherwise. There is **no unequip**: pressing a slot assigns, and nothing in
 * the original ever empties one, so the button that already holds this weapon
 * is simply inert rather than a toggle.
 */
function EquipControls({ row }: { row: ShopRow }): React.ReactElement | null {
  if (!row.owned) return null;

  if (row.category === 'secondary') {
    return (
      <div className="shop-row__equip">
        <button
          type="button"
          className={`shop-row__slot${row.equipped ? ' shop-row__slot--on' : ''}`}
          disabled={row.equipped}
          aria-pressed={row.equipped}
          aria-label={row.equipped ? `${row.name} equipped` : `Equip ${row.name}`}
          onClick={() => GameEvents.emit('ui:equip-secondary', { id: row.id })}
        >
          {row.equipped ? 'Equipped' : 'Equip'}
        </button>
      </div>
    );
  }

  if (row.category !== 'primary') return null;

  return (
    <div className="shop-row__equip" role="group" aria-label={`${row.name} slots`}>
      {([1, 2] as const).map((slot) => {
        const here = row.slot === slot;
        return (
          <button
            key={slot}
            type="button"
            className={`shop-row__slot${here ? ' shop-row__slot--on' : ''}`}
            disabled={here}
            aria-pressed={here}
            aria-label={
              here ? `${row.name} in slot ${slot}` : `Put ${row.name} in slot ${slot}`
            }
            onClick={() => GameEvents.emit('ui:equip-primary', { slot, id: row.id })}
          >
            Slot {slot}
          </button>
        );
      })}
    </div>
  );
}

/**
 * `SLOT 1 | SLOT 2` — the two primary slots and what is in them.
 *
 * `ScreenUpgrades` draws these as `weaponSlotImage1` and `weaponSlotImage2` at
 * (284, 178) and (340, 178), with `bWeaponSwitch` between them at 312
 * (`:570-579`) — so: two labelled wells holding the equipped weapon's own art,
 * with a small marker centred between the pair. The port draws that marker as
 * a red diamond and does not wire it: `bWeaponSwitch` swaps the two slots, and
 * nothing in `ShopCatalogue` carries a swap. Noted at the element rather than
 * in a report, which is where someone will be standing when it matters.
 *
 * **A readout, not a control.** Equipping happens in the detail window, where
 * the weapon being equipped is named; a second place to change it would be a
 * second rule about what an empty slot means.
 *
 * The weapon's *name* is present but visually hidden. The original shows only
 * the picture, and matching that would leave a screen reader with two wells
 * called "Slot 1" and "Slot 2" and no way to tell what is in either.
 */
function SlotSummary({ rows }: { rows: ShopRow[] }): React.ReactElement {
  const inSlot = (slot: 1 | 2): ShopRow | null => rows.find((r) => r.slot === slot) ?? null;

  return (
    <dl className="shop__slots">
      {([1, 2] as const).map((slot, i) => (
        <Fragment key={slot}>
          {i === 1 && <span className="shop__slots-mark" aria-hidden="true" />}
          <div className="shop__slot">
            <dt>Slot {slot}</dt>
            <dd>
              {inSlot(slot) === null ? (
                <>
                  <span className="shop__slot-empty" aria-hidden="true" />
                  <span className="visually-hidden">Empty</span>
                </>
              ) : (
                <>
                  <UpgradeIcon
                    layers={inSlot(slot)!.tile}
                    label={inSlot(slot)!.name}
                    size="var(--slot-icon)"
                  />
                  <span className="visually-hidden">{inSlot(slot)!.name}</span>
                </>
              )}
            </dd>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * One upgrade, as an icon button — `ButtonWeapon` / `ButtonMisc`.
 *
 * The level number sits over the art's top-left corner because that is where
 * the original puts it: `levelTextWeapon1` is placed at the button's own
 * `x + 1, y + 2` in a 20x20 field (`:592`).
 */
function UpgradeTile({
  row,
  selected,
  onSelect,
}: {
  row: ShopRow;
  selected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  // The corner comes from `infoTextSites.ts`, which pins it against
  // `ButtonUpgradeInfo.as:163` rather than restating it here. The first wiring
  // did restate it — `showTop: false`, cited to `:56`, a description string
  // rather than the call — and the panel opened upward over the row above the
  // one it described. Two booleans four lines from their text is exactly the
  // constant a test cannot check while the code is its own source.
  const info = UPGRADE_DESCRIPTIONS.find(
    (d) => d.category === row.category && d.index === row.index + 1,
  );
  const hover = useInfoText({
    text: info?.text ?? row.name,
    ...siteCorner('ButtonUpgradeInfo.as:163'),
  });

  const classes = ['shop-tile'];
  if (selected) classes.push('shop-tile--on');
  if (!row.owned) classes.push('shop-tile--locked');
  // A ring on anything within reach of the current balance. See the header of
  // the CSS block: the original never had to solve this, because it never
  // showed 28 prices at once either — but nor did it hide them behind a
  // selection the way a single detail window does.
  if (row.affordable && row.cost !== null) classes.push('shop-tile--affordable');

  return (
    <li className="shop-grid__cell">
      <button
        type="button"
        className={classes.join(' ')}
        aria-pressed={selected}
        aria-label={
          row.owned
            ? `${row.name}, level ${row.level} of ${row.maxLevel}`
            : `${row.name}, not owned`
        }
        onClick={onSelect}
        {...hover}
      >
        <UpgradeIcon layers={row.tile} label={row.name} size="var(--tile-icon)" />
        <span className="shop-tile__level" aria-hidden="true">
          {row.owned ? row.level : '–'}
        </span>
      </button>
    </li>
  );
}

/**
 * The right-hand window — `bgWindow` and everything the AS3 pins inside it.
 *
 * Reads the *selected* row, which is why every figure is addressed by
 * selection rather than repeated 28 times.
 */
function DetailWindow({ row, money }: { row: ShopRow | null; money: number }): React.ReactElement {
  const maxed = row !== null && row.cost === null;
  const lines = row?.previews.filter((line) => line !== '') ?? [];

  return (
    /*
      `aria-live` because the whole point of this panel is that its contents
      change without it moving — a sighted player sees the swap, and without
      this a screen-reader user pressing a tile would hear nothing at all.
    */
    <aside className="shop-detail" aria-live="polite">
      {/* `addText(moneyText, …, 65280, …)` at `:581` — green, at the window's
          top edge, which is where the AS3 puts it too. */}
      <p className="shop-detail__balance shop__balance" aria-label={`${money} coins`}>
        ${formatNumber(money)}
      </p>

      {row === null ? (
        <p className="screen__hint">Loading…</p>
      ) : (
        <>
          <h3 className="shop-detail__name">{row.name}</h3>
          <p className="shop-detail__level">
            {row.owned ? `Level ${row.level} / ${row.maxLevel}` : 'Not owned'}
          </p>

          {/*
            `damageTypeText` — `:584` draws it in red (`16711680`) under the
            level, with `iconDamageType` beside it. The icon is not ported; the
            line is, from the AS3's own lookup rather than from the weapon's
            bullet class. `null` renders nothing: see `damageTypeLabel`.
          */}
          {damageTypeLabel(row.category, row.index + 1) !== null && (
            <p className="shop-detail__damage">{damageTypeLabel(row.category, row.index + 1)}</p>
          )}

          <div className="shop-detail__meter" aria-hidden="true">
            {Array.from({ length: row.maxLevel }, (_, i) => (
              <span
                key={i}
                className={`shop-row__pip ${i < row.level ? 'shop-row__pip--filled' : ''}`}
              />
            ))}
          </div>

          {/*
            The five stat lines — `ScreenUpgrades`' `infoText1-5`. An empty
            string clears a line this upgrade does not use, so those are
            skipped here rather than rendered as blank rows; the *array* still
            carries all five so the scene and the screen cannot disagree about
            which slot is which.
          */}
          {lines.length > 0 && (
            <ul className="shop-detail__stats">
              {lines.map((line, i) => {
                const [label, value] = splitStat(line);
                return (
                  <li key={i} className="shop-row__stat">
                    <span className="shop-stat__label">{label}</span>
                    {value !== null && <span className="shop-stat__value">{value}</span>}
                  </li>
                );
              })}
            </ul>
          )}

          <EquipControls row={row} />

          <button
            type="button"
            className="shop-buy gloss-pill"
            disabled={maxed || !row.affordable}
            aria-label={
              maxed
                ? `${row.name} fully upgraded`
                : `${row.owned ? 'Upgrade' : 'Buy'} ${row.name} for ${row.cost} coins`
            }
            onClick={() => GameEvents.emit('ui:buy-upgrade', { id: row.id })}
          >
            {maxed ? (
              <span className="shop-buy__verb">MAX</span>
            ) : (
              <>
                <span className="shop-buy__verb">{row.owned ? 'Upgrade' : 'Buy'}</span>
                <span className="shop-buy__price">◉ {formatNumber(row.cost ?? 0)}</span>
              </>
            )}
          </button>
        </>
      )}
    </aside>
  );
}

export function UpgradesScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const shop = useShop();
  // Before the early return — a hook order that depends on the active scene is
  // a crash the first time the shop opens.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (activeScene !== 'Upgrades') return null;

  const rows = shop?.upgrades ?? [];
  // Keyed by id, so a republished catalogue after a purchase keeps the
  // selection. Falling back to the first row rather than to nothing means the
  // window is never blank while the catalogue is full.
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  return (
    <ScreenShell
      title="Upgrades"
      titleClip="TitleUpgrades"
      typeTitle
      nav="Upgrades"
      className="screen--shop"
      /*
       * No `affordable` here, deliberately. `ButtonUpgrades`' 7 frames carry a
       * "you can afford something" state (`makeIcon`), but frame 7 — you are
       * here — is not shifted by it, so on *this* screen the flag can change
       * nothing. It matters on the other four, whose tab points at a shop they
       * cannot see the money for; the store's catalogue is published by
       * `UpgradesScene` and is not populated elsewhere yet, so wiring it is
       * T158's, where that data lives. `navTabs.ts` already implements the
       * rule and is tested against the AS3.
       */
    >
      <div className="shop">
        <div className="shop__catalogue">
          <div className="shop__groups">
            {rows.length === 0 ? (
              <p className="screen__hint">Loading…</p>
            ) : (
              CATEGORY_ORDER.map((category) => {
                const inCategory = rows.filter((r) => r.category === category);
                if (inCategory.length === 0) return null;
                return (
                  <section key={category} className="shop-group">
                    <h3 className="shop-group__title">{CATEGORY_LABELS[category] ?? category}</h3>
                    <ul className="shop-grid">
                      {inCategory.map((row) => (
                        <UpgradeTile
                          key={row.id}
                          row={row}
                          selected={selected?.id === row.id}
                          onSelect={() => setSelectedId(row.id)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          <div className="shop__footer">
            <SlotSummary rows={rows} />

            {/* `ScreenUpgrades.as:631-634` places the guide inside the shop's
                own content holder, below the tiles — which is where this sits
                too, now that the catalogue is tiles rather than a long list. */}
            <LevelGuideWidget />
          </div>
        </div>

        <DetailWindow row={selected} money={shop?.money ?? 0} />
      </div>

      {/* Say what is missing rather than silently omitting it.
          **Nothing is withheld today** — all 28 upgrades are sold, so this
          renders nothing. Kept rather than deleted: `purchasable.ts` is still
          the gate, and the day an upgrade is pulled from sale again this is
          what stops the shop reading as the whole catalogue. The count used to
          be 13; the comment said so long after it was 0. */}
      {(shop?.withheld ?? 0) > 0 && (
        <p className="screen__hint">
          {shop!.withheld} more upgrades exist in the original but are not sold yet — their
          effects are unported, so buying one would take your coins and change nothing.
        </p>
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          className="menu__button menu__button--ghost shop__dev-grant"
          onClick={() => GameEvents.emit('ui:dev-grant-money', { amount: DEV_GRANT })}
        >
          Dev: +{formatNumber(DEV_GRANT)} coins
        </button>
      )}

      {/* The "Level select ›" exit is gone: the bottom bar carries that move
          now, on the tab the original uses for it (`BottomBar.as:47`). Two
          controls for one destination is how they drift. */}
    </ScreenShell>
  );
}
