"use client";

interface ActionButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  activeColor: string;
  inactiveColor: string;
  hoverColor: string;
  title: string;
  icon: React.ReactNode;
}

/**
 * Reusable action button component with tooltip
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  isActive = false,
  activeColor,
  inactiveColor,
  hoverColor,
  title,
  icon
}) => {
  const colorClass = isActive 
    ? activeColor 
    : `${inactiveColor} hover:${hoverColor}`;

  return (
    <button
      className={`p-1.5 transition-colors group relative ${colorClass}`}
      title={title}
      onClick={onClick}
    >
      {icon}
      <span className="absolute top-full right-0 w-max bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {title}
      </span>
    </button>
  );
};

export default ActionButton;