import * as React from "react";

interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue, value, onValueChange }) => {
  const [currentValue, setCurrentValue] = React.useState(defaultValue || "");

  const handleChange = (newValue: string) => {
    setCurrentValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.type === TabsList
          ? React.cloneElement(child, { value: currentValue, onChange: handleChange })
          : child
      )}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, value, onChange, className }) => (
  <div className={`flex ${className || ""}`}>
    {React.Children.map(children, (child) =>
      React.isValidElement(child) && child.type === TabsTrigger
        ? React.cloneElement(child, { isActive: child.props.value === value, onClick: () => onChange?.(child.props.value) })
        : child
    )}
  </div>
);

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ children, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 border-b-2 ${isActive ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500"}`}
  >
    {children}
  </button>
);

interface TabsContentProps {
  children: React.ReactNode;
  value: string;
  activeValue?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ children, value, activeValue }) => {
  if (value !== activeValue) return null;
  return <div>{children}</div>;
};
