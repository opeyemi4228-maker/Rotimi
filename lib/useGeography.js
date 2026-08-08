"use client";

/**
 * The client half of lib/geography.js: fetches a state's LGAs and wards when
 * the member picks the state, then that LGA's polling units when they pick the
 * LGA, and hands the forms ready lists.
 *
 * Used by /join and /registration, which is why it is a hook and not inlined:
 * both forms have to behave identically, down to what happens when the network
 * drops halfway through.
 *
 * The two fetches are deliberately separate. Wards are what registration
 * actually needs and they arrive in a few kilobytes; the polling units of an
 * LGA are ten times that and are optional, so they are not fetched until the
 * member has narrowed down far enough to want them.
 *
 * ── ON THE SHAPE OF THE STATE ──────────────────────────────────────────────
 * Each fetch stores one atom — `{ key, data, error }` — where `key` is the
 * state or LGA the data belongs to. Nothing is reset when the selection
 * changes; instead the result is only *used* when its key still matches the
 * current selection, and "loading" is the gap between the two.
 *
 * That is not a stylistic choice. The previous version cleared the tree and set
 * a loading flag synchronously inside the effect, which React 19 rightly flags
 * as cascading renders — and it had a real bug in it: between clearing and
 * resolving, a member who switched states saw the previous state's LGA list.
 * Deriving from a keyed atom makes that unrepresentable.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from "react";
import {
  loadState,
  loadUnits,
  lgasFor,
  wardsFor,
  findLga,
  findWard,
  pollingUnitsFor,
} from "./geography";

const EMPTY = { key: null, data: null, error: false };

export function useGeography(state, lga, ward) {
  const [states, setStates] = useState(EMPTY);
  const [units, setUnits] = useState(EMPTY);

  useEffect(() => {
    if (!state) return;

    // A member who changes their mind mid-fetch must not be shown the tree
    // they abandoned, however late it arrives.
    let live = true;

    loadState(state)
      .then((data) => live && setStates({ key: state, data, error: false }))
      .catch(() => live && setStates({ key: state, data: null, error: true }));

    return () => {
      live = false;
    };
  }, [state]);

  // Only this state's tree counts. Anything else is a result still in flight.
  const tree = states.key === state ? states.data : null;
  const treeError = states.key === state && states.error;
  const loading = Boolean(state) && !tree && !treeError;

  const lgaRecord = useMemo(() => findLga(tree, lga), [tree, lga]);
  const wardRecord = useMemo(() => findWard(tree, lga, ward), [tree, lga, ward]);
  const lgaCode = lgaRecord?.code ?? null;

  useEffect(() => {
    if (!lgaCode) return;

    let live = true;

    loadUnits(lgaCode)
      .then((data) => live && setUnits({ key: lgaCode, data, error: false }))
      // A failed polling unit fetch is not a failed registration: the field is
      // optional, so the form carries on without it rather than blocking.
      .catch(() => live && setUnits({ key: lgaCode, data: null, error: true }));

    return () => {
      live = false;
    };
  }, [lgaCode]);

  const unitData = units.key === lgaCode ? units.data : null;
  const unitsError = units.key === lgaCode && units.error;

  const lgas = useMemo(() => lgasFor(tree), [tree]);
  const wards = useMemo(() => wardsFor(tree, lga), [tree, lga]);
  const unitOptions = useMemo(
    () => pollingUnitsFor(unitData, wardRecord?.code),
    [unitData, wardRecord]
  );

  return {
    lgas,
    wards,
    units: unitOptions,
    lgaCode,
    wardCode: wardRecord?.code ?? null,
    unitCount: wardRecord?.units ?? 0,
    loading,
    unitsLoading: Boolean(lgaCode) && !unitData && !unitsError,
    error: treeError,
    ready: Boolean(tree),
  };
}
