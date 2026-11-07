/* Custom crop set (R5). These are Herra's own 24x24 line illustrations,
   copied verbatim from the mockup. They are not Phosphor glyphs.

   Only the six crops in the champion model roster have illustrations. */

export const CROP_SVG: Record<string, string> = {
  banana: '<path d="M5 6c.8 8 6 13 14 13-1.6-3-4-4-6-4-3 0-5.2-4-5.2-8.8z"/><path d="M5 6L4 3M8.5 16c-2-2.2-3-5.2-3.4-9"/><path d="M19 19l1.5.5"/>',
  cabbage: '<circle cx="12" cy="13.5" r="8"/><path d="M12 5.5c-2 3-2.6 5.5-2.6 8.2 0 3 .8 5.5 2.6 7.8M12 5.5c2 3 2.6 5.5 2.6 8.2 0 3-.8 5.5-2.6 7.8"/><path d="M4.4 10.5c2.8.2 4.8 1.2 6.2 3M19.6 10.5c-2.8.2-4.8 1.2-6.2 3"/>',
  cassava: '<path d="M3.5 20.5C3 17 5 13.5 9 11l4-2.5 2.5 3L12 15c-2.6 3.4-5.8 5.8-8.5 5.5z"/><path d="M13 8.5l4.5-4.5M16 5.5l3.5-.5.5 3.5"/><path d="M6.5 17l2-1.5"/>',
  coconut: '<circle cx="12" cy="13.5" r="7.5"/><circle cx="9.6" cy="11.4" r=".9"/><circle cx="14.4" cy="11.4" r=".9"/><circle cx="12" cy="14.6" r=".9"/><path d="M12 6c0-2 1-3.2 3.2-3.8"/>',
  maize: '<path d="M12 3c3 2 4.5 5.5 4.5 9.5S15 19 12 21c-3-2-4.5-5-4.5-8.5S9 5 12 3z"/><path d="M12 3v18M8.2 9h7.6M7.6 13h8.8"/><path d="M12 21c-3 0-5.5-2-6.5-4.5M12 21c3 0 5.5-2 6.5-4.5"/>',
  rice: '<path d="M12 21V9"/><path d="M12 9c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4z"/><path d="M12 9c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4z"/><path d="M12 14.5c-2.5 0-4-1.8-4-4 2.5 0 4 1.8 4 4z"/><path d="M12 14.5c2.5 0 4-1.8 4-4-2.5 0-4 1.8-4 4z"/><path d="M12 3v3"/>',
};

export const FAM_COLOR: Record<string, string> = {
  cereal: "var(--cereal)",
  root: "var(--root)",
  legume: "var(--legume)",
  fruit: "var(--fruit)",
  vegetable: "var(--vegetable)",
  plantation: "var(--plantation)",
  fiber: "var(--fiber)",
  herb: "var(--herb)",
};
