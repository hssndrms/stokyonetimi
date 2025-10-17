import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formInputSmallClass } from '../styles/common';

// The Portal now takes a pre-calculated style. Its own internal style logic is removed.
const DropdownPortal: React.FC<{
  targetEl: HTMLElement | null;
  children: React.ReactNode;
  onClose: () => void;
  style: React.CSSProperties; // New prop for pre-calculated styles
}> = ({ targetEl, children, onClose, style }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // useEffect for scroll events remains to close the dropdown if the page scrolls.
    useEffect(() => {
        const handleScroll = (event: Event) => {
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            onClose();
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    // useEffect for outside clicks remains.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            if ((targetEl && targetEl.contains(target)) || (dropdownRef.current && dropdownRef.current.contains(target))) {
                return;
            }

            const dropdownRect = dropdownRef.current?.getBoundingClientRect();
            if (dropdownRect && 
                event.clientX >= dropdownRect.left && 
                event.clientX <= dropdownRect.right &&
                event.clientY >= dropdownRect.top && 
                event.clientY <= dropdownRect.bottom
            ) {
                return;
            }
            onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, targetEl]);

    if (!targetEl) return null;

    return createPortal(
        // The style is applied directly from props. This is the core of the fix.
        <div 
            ref={dropdownRef} 
            style={style} 
            className="z-[1001]"
            onMouseDown={(e) => e.stopPropagation()}
        >
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
  // We now use a single state for position, which also determines if the dropdown is open.
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const isOpen = position !== null;
  
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);
  const [inputValue, setInputValue] = useState(selectedOption?.name || '');
  
  // This effect correctly resets the input value when the dropdown is closed or selection changes.
  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption?.name || '');
    }
  }, [selectedOption, isOpen]);


  const filteredOptions = useMemo(() => {
    if (!isOpen) return [];
    if (inputValue === selectedOption?.name) {
      return options;
    }
    return options.filter(option =>
      option.name?.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue, isOpen, selectedOption]);
  
  const closeDropdown = () => {
      setPosition(null);
  };

  // The core logic to calculate position and open the dropdown.
  const openDropdown = () => {
    if (!inputRef.current || disabled) return;

    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const DROPDOWN_MAX_HEIGHT = 240;
    const MARGIN = 8;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const positionStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        overflowY: 'auto',
    };

    const opensUp = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;

    if (opensUp) {
        positionStyle.bottom = `${viewportHeight - rect.top}px`;
        positionStyle.top = 'auto';
        positionStyle.maxHeight = `${Math.min(DROPDOWN_MAX_HEIGHT, spaceAbove - MARGIN)}px`;
    } else {
        positionStyle.top = `${rect.bottom}px`;
        positionStyle.bottom = 'auto';
        positionStyle.maxHeight = `${Math.min(DROPDOWN_MAX_HEIGHT, spaceBelow - MARGIN)}px`;
    }
    
    setPosition(positionStyle);
  }

  const handleSelect = (optionId: string) => {
    const option = options.find(o => o.id === optionId);
    setInputValue(option?.name || '');
    onChange(optionId);
    closeDropdown(); // Sets position to null
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (!isOpen) {
          openDropdown(); // Open if user starts typing
      }
  }
  
  // Handles both click and keyboard focus
  const handleFocus = () => {
    if (!isOpen) {
      openDropdown();
    }
  };
  
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`${formInputSmallClass} ${error ? 'border-red-500' : ''}`}
        aria-invalid={error}
        autoComplete="off"
      />
      {isOpen && !disabled && (
        <DropdownPortal 
            targetEl={inputRef.current} 
            onClose={closeDropdown}
            style={position!} // The style is passed pre-calculated.
        >
            <ul className="searchable-select-dropdown w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-md mt-1 shadow-lg">
            {filteredOptions.map(option => (
                <li
                    key={option.id}
                    onMouseDown={(e) => {
                        e.preventDefault(); 
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