// src/components/Shared/MaterialIcon.jsx
//
// Renders one glyph from the Advika Auto redesign's icon vocabulary
// (design_handoff_advika_auto/README.md "Assets" — the full "Glyphs in
// use" list) using this codebase's existing icon pattern: react-icons,
// already used in 38+ other components (Navbar's old FiHome/FiHeart/etc.,
// CartItem, OrderCard, ProductCard, ...). Every glyph name here has a
// same-name match in react-icons/md (Google's Material Icons set bundled
// as SVG components — `Md` + PascalCase of the snake_case glyph name),
// so this is a name -> component lookup, not a second icon system.
//
// An earlier version of this component rendered the raw Material Symbols
// Outlined *ligature web font* instead (a `<span>` whose text content is
// the glyph name, e.g. "favorite_border", shaped into a glyph by the font
// via `font-feature-settings: liga`). That works once the font has
// loaded, but degrades badly before it has: the browser paints the
// literal ligature text, which is wider than the intended glyph and can
// overlap neighbouring icons (see the fix in an earlier commit that
// clipped it to a box) — and worse, it's a real network dependency this
// audience ("drivers ... often on a slow connection", per the handoff)
// shouldn't need just to see a home icon. react-icons ships the glyph as
// an inline SVG in the JS bundle: it always renders immediately, with no
// font fetch, no FOUC/FOUT window, and no risk of a slow or blocked font
// host ever showing raw glyph-name text. The handoff's own Assets section
// says as much: "Prefer your codebase's icon component ... and subset to
// only the glyphs used" — this map *is* that subsetting.
import React from 'react';
import {
  MdBolt,
  MdMenu,
  MdClose,
  MdSearch,
  MdSearchOff,
  MdShoppingCart,
  MdAddShoppingCart,
  MdRemoveShoppingCart,
  MdFavorite,
  MdFavoriteBorder,
  MdPersonOutline,
  MdReceiptLong,
  MdGridView,
  MdTranslate,
  MdSupportAgent,
  MdChevronRight,
  MdChevronLeft,
  MdArrowBack,
  MdArrowForward,
  MdAdd,
  MdRemove,
  MdCheck,
  MdCheckCircle,
  MdCancel,
  MdError,
  MdVerified,
  MdStar,
  MdMilitaryTech,
  MdPayments,
  MdLocalShipping,
  MdDeliveryDining,
  MdInventory,
  MdInventory2,
  MdLocationOn,
  MdWhereToVote,
  MdCall,
  MdChat,
  MdCreditCard,
  MdAccountBalance,
  MdSchedule,
  MdCalendarToday,
  MdEventAvailable,
  MdSavings,
  MdSort,
  MdSell,
  MdEdit,
  MdDeleteOutline,
  MdLogin,
  MdLogout,
  MdNotifications,
  MdExpandMore,
  MdPhotoCamera,
  MdThumbUp,
  MdPlayArrow,
  MdWbIncandescent,
  MdWbTwilight,
  MdLightMode,
  MdHighlight,
  MdVolumeUp,
  MdAirlineSeatReclineExtra,
  MdAgriculture,
  MdAirportShuttle,
  MdAutoAwesome,
  MdCable,
  MdShield,
  MdHealthAndSafety,
  MdBuild,
  MdTripOrigin,
} from 'react-icons/md';

const ICONS = {
  bolt: MdBolt,
  menu: MdMenu,
  close: MdClose,
  search: MdSearch,
  search_off: MdSearchOff,
  shopping_cart: MdShoppingCart,
  add_shopping_cart: MdAddShoppingCart,
  remove_shopping_cart: MdRemoveShoppingCart,
  favorite: MdFavorite,
  favorite_border: MdFavoriteBorder,
  person_outline: MdPersonOutline,
  receipt_long: MdReceiptLong,
  grid_view: MdGridView,
  translate: MdTranslate,
  support_agent: MdSupportAgent,
  chevron_right: MdChevronRight,
  chevron_left: MdChevronLeft,
  arrow_back: MdArrowBack,
  arrow_forward: MdArrowForward,
  add: MdAdd,
  remove: MdRemove,
  check: MdCheck,
  check_circle: MdCheckCircle,
  cancel: MdCancel,
  error: MdError,
  verified: MdVerified,
  star: MdStar,
  military_tech: MdMilitaryTech,
  payments: MdPayments,
  local_shipping: MdLocalShipping,
  delivery_dining: MdDeliveryDining,
  inventory: MdInventory,
  inventory_2: MdInventory2,
  location_on: MdLocationOn,
  where_to_vote: MdWhereToVote,
  call: MdCall,
  chat: MdChat,
  credit_card: MdCreditCard,
  account_balance: MdAccountBalance,
  schedule: MdSchedule,
  calendar_today: MdCalendarToday,
  event_available: MdEventAvailable,
  savings: MdSavings,
  sort: MdSort,
  sell: MdSell,
  edit: MdEdit,
  delete_outline: MdDeleteOutline,
  login: MdLogin,
  logout: MdLogout,
  notifications: MdNotifications,
  expand_more: MdExpandMore,
  photo_camera: MdPhotoCamera,
  thumb_up: MdThumbUp,
  play_arrow: MdPlayArrow,
  wb_incandescent: MdWbIncandescent,
  wb_twilight: MdWbTwilight,
  light_mode: MdLightMode,
  highlight: MdHighlight,
  volume_up: MdVolumeUp,
  airline_seat_recline_extra: MdAirlineSeatReclineExtra,
  agriculture: MdAgriculture,
  airport_shuttle: MdAirportShuttle,
  auto_awesome: MdAutoAwesome,
  cable: MdCable,
  shield: MdShield,
  health_and_safety: MdHealthAndSafety,
  build: MdBuild,
  trip_origin: MdTripOrigin,
};

export default function MaterialIcon({ name, size = 20, color, className, style, ...rest }) {
  const Icon = ICONS[name];
  if (!Icon) {
    if (import.meta.env.DEV) {
      console.warn(`MaterialIcon: no react-icons/md mapping for "${name}" — add it to ICONS in MaterialIcon.jsx.`);
    }
    return null;
  }
  return (
    <Icon
      size={size}
      color={color}
      className={className}
      style={style}
      aria-hidden="true"
      {...rest}
    />
  );
}
