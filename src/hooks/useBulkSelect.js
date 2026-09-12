import { useMemo, useRef, useState } from "react";

export function useBulkSelect(items, getId = (x) => x.id, longPressMs = 700) {
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState(false);
  const timer = useRef(null);

  const ids = useMemo(() => items.map(getId), [items, getId]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
  const someSelected = selected.length > 0 && !allSelected;

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setSelected(allSelected ? [] : ids);

  const clear = () => {
    setSelected([]);
    setMode(false);
  };

  const startMode = () => {
    cancelPress();
    setMode(true);
  };

  const cancelPress = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const startPress = (id) => {
    cancelPress();
    timer.current = setTimeout(() => {
      timer.current = null;
      setMode(true);
      setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, longPressMs);
  };

  const rowProps = (id) => ({
    onTouchStart: () => startPress(id),
    onTouchEnd: cancelPress,
    onTouchMove: cancelPress,
    onMouseDown: () => startPress(id),
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onContextMenu: (e) => e.preventDefault(),
  });

  return {
    selected,
    selectedSet,
    allSelected,
    someSelected,
    mode,
    toggle,
    toggleAll,
    clear,
    startMode,
    startPress,
    cancelPress,
    rowProps,
  };
}
