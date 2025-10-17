import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formInputSmallClass } from '../styles/common';

// This portal component renders its children in a div attached to document.body.
// It positions itself based on the target element and handles closing on outside clicks or scroll.
const DropdownPortal: React.FC<{
  targetEl: HTMLElement | null;
  children: React.ReactNode;
  onClose: () => void;
}> = ({ targetEl, children, onClose }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            setStyle({
                position: 'fixed',
                top: `${rect.bottom}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
            });

            // Close dropdown on scroll to prevent it from being misplaced
            const handleScroll = () => {
                onClose();
            };
            window.addEventListener('scroll', handleScroll, true);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [targetEl, onClose]);

    useEffect(() => {
        // Close dropdown when clicking outside of it or its target input
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                targetEl && 
                !targetEl.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, targetEl]);


    if (!targetEl) return null;

    return createPortal(
        <div ref={dropdownRef} style={style} className="z-[1001]"> {/* High z-index to appear over modals */}
            {children}
        </div>,
        document.body
    );
};

const SearchableSelect: React.FC<{
  options: { id: string; name: string | undefined }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
}> = ({ options, value, onChange, placeholder, disabled = false, error = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected option based on the incoming value prop
  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

  // This state is the single source of truth for the input's text content.
  const [inputValue, setInputValue] = useState(selectedOption?.name || '');
  
  // This effect syncs the inputValue with the selectedOption when the dropdown is closed.
  // This handles cases where the `value` prop changes from the parent, or when the user clicks away,
  // reverting the input to the currently selected value's name.
  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption?.name || '');
    }
  }, [selectedOption, isOpen]);


  const filteredOptions = useMemo(() => {
    // Only filter if the dropdown is open. Otherwise, the list can be empty.
    if (!isOpen) return [];
    
    // If inputValue is the same as the selected option name, it means the user just clicked
    // the input but hasn't typed yet. In this case, show all options for better UX.
    if (inputValue === selectedOption?.name) {
      return options;
    }

    return options.filter(option =>
      option.name?.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue, isOpen, selectedOption]);
  
  const handleSelect = (optionId: string) => {
    const option = options.find(o => o.id === optionId);
    setInputValue(option?.name || ''); // Explicitly set the display value
    onChange(optionId); // Notify parent of the change
    setIsOpen(false); // Close the dropdown
    inputRef.current?.blur(); // Unfocus the input
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (!isOpen) setIsOpen(true);
  }
  
  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const closeDropdown = () => {
      setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue} // The input is now fully controlled by the `inputValue` state.
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`${formInputSmallClass} ${error ? 'border-red-500' : ''}`}
        aria-invalid={error}
        autoComplete="off"
      />
      {isOpen && !disabled && (
        <DropdownPortal targetEl={inputRef.current} onClose={closeDropdown}>
            <ul className="searchable-select-dropdown w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
            {filteredOptions.map(option => (
                <li
                    key={option.id}
                    // Use onMouseDown to prevent input blur from closing dropdown before selection.
                    // Stop propagation to prevent clicks from reaching modal overlays and closing them.
                    onMouseDown={(e) => {
                        e.preventDefault(); 
                        e.stopPropagation();
                        handleSelect(option.id)
                    }}
                    className="dropdown-item px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 text-sm"
                >
                    {option.name}
                </li>
                ))
            }
            {filteredOptions.length === 0 && (
                <li className="dropdown-item-empty px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Sonuç bulunamadı</li>
            )}
            </ul>
        </DropdownPortal>
      )}
    </div>
  );
};

export default SearchableSelect;