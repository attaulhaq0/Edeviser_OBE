// Browser chrome follows the actual root semantic surface, including contrast
// overrides. No second palette or persisted preference is defined here.
interface ThemeColorLease {
  references: number;
  release: () => void;
}
const leases = new WeakMap<Document, ThemeColorLease>();

export function observeThemeColor(doc: Document): () => void {
  let lease = leases.get(doc);
  if (!lease) {
    const view = doc.defaultView;
    if (!view || !doc.head) return () => {};
    let meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) { meta = doc.createElement("meta"); meta.name = "theme-color"; doc.head.append(meta); }
    const target = meta;
    const previous = target.getAttribute("content");
    let lastWritten: string | null = previous;
    let active = true;
    const synchronize = () => {
      if (!active) return;
      const color = view.getComputedStyle(doc.documentElement).getPropertyValue("--background").trim();
      if (!color || !target.isConnected) return;
      if (target.content !== color) target.content = color;
      lastWritten = color;
    };
    const observer = new MutationObserver(synchronize);
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    doc.addEventListener("load", synchronize, true);
    synchronize();
    lease = {
      references: 0,
      release() {
        active = false;
        observer.disconnect();
        doc.removeEventListener("load", synchronize, true);
        // Compare-and-restore only the last value; preserve a different value
        // written by another owner rather than overwriting it during cleanup.
        if (target.isConnected && target.getAttribute("content") === lastWritten) {
          if (created) target.remove();
          else if (previous === null) target.removeAttribute("content");
          else target.setAttribute("content", previous);
        }
      },
    };
    leases.set(doc, lease);
  }
  const ownedLease = lease;
  ownedLease.references++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--ownedLease.references === 0) { ownedLease.release(); leases.delete(doc); }
  };
}
