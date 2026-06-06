// The single hand-edited category registry.
// Array order = z-order (back -> front). Options within a category are derived
// from the PNG filenames by build-manifest.mjs, so adding art needs no code change.

export const CANVAS = { width: 3840, height: 2420 };

export const CATEGORIES = [
  { id: 'CardBase',      label: 'Card',        select: 'single', required: true },
  { id: 'PhotoBackdrop', label: 'Backdrop',    select: 'single', required: true },
  { id: 'BodyBase',      label: 'Body',        select: 'single', required: true },
  { id: 'Clothes',       label: 'Clothes',     select: 'single', required: true },
  { id: 'HairBack',      label: 'Hair (back)', select: 'single', required: false },
  { id: 'Face',          label: 'Face',        select: 'single', required: true },
  { id: 'HairFront',     label: 'Hair',        select: 'single', required: true },
  { id: 'Glasses',       label: 'Glasses',     select: 'single', required: false },
  { id: 'Headwear',      label: 'Headwear',    select: 'multi' },
  { id: 'Badges',        label: 'Badges',      select: 'multi' },
  { id: 'Stickers',      label: 'Stickers',    select: 'multi' },
  { id: 'CardChrome',    label: 'Frame',       select: 'single', required: true, fixed: true },
];

export const TEXT_FIELDS = [
  { id: 'name',        label: 'Name',        x: 2000, y: 480,  fontSize: 110, maxLength: 24, align: 'left' },
  { id: 'birthday',    label: 'Birthday',    x: 2000, y: 800,  fontSize: 110, maxLength: 18, align: 'left' },
  { id: 'class',       label: 'Class',       x: 2000, y: 1120, fontSize: 110, maxLength: 18, align: 'left' },
  { id: 'nationality', label: 'Nationality', x: 2000, y: 1440, fontSize: 110, maxLength: 20, align: 'left' },
];
