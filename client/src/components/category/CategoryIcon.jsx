import { Grid2X2, Landmark, Leaf, Music2, PenTool, Square } from "lucide-react";

import {
  allCategoriesPresentation,
  getCategoryPresentation,
} from "../../data/categoryPresentation";

const WordsIcon = ({ size = 20, strokeWidth = 1.8, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <text
      x="12"
      y="15"
      fill="currentColor"
      stroke="none"
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize="8.5"
      fontWeight="700"
    >
      Aa
    </text>
  </svg>
);

const iconComponents = {
  grid: Grid2X2,
  landmark: Landmark,
  leaf: Leaf,
  music: Music2,
  pen: PenTool,
  square: Square,
  words: WordsIcon,
};

const CategoryIcon = ({ category, icon, size = 20, ...props }) => {
  const iconName =
    icon ||
    getCategoryPresentation(category)?.icon ||
    (category === "all-categories" ? allCategoriesPresentation.icon : "grid");
  const Icon = iconComponents[iconName] || Grid2X2;

  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
};

export default CategoryIcon;
