export function createRevisionController() {
  let revision = 0;

  return {
    next() {
      revision += 1;
      return revision;
    },
    current() {
      return revision;
    },
    isCurrent(candidate) {
      return candidate === revision;
    },
    invalidate() {
      revision += 1;
      return revision;
    },
    reset() {
      revision = 0;
      return revision;
    },
  };
}
