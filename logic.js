(function exposePrototypeLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CrmPrototypeLogic = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPrototypeLogic() {
  function filterRows(rows, valueIndex, selected) {
    return selected === "全部" ? rows : rows.filter((row) => row[valueIndex] === selected);
  }

  return { filterRows };
}));
