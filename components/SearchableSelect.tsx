import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formInputSmallClass } from '../styles/common';

const SearchableSelect: React.FC<{
  options: { id: string; name: string | undefined }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
}> = ({ options, value, onChange, placeholder, disabled = false, error = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

  const filteredOptions = useMemo(() =>
    options.filter(option =>
      option.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [options, searchTerm]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      if(!isOpen) setIsOpen(true);
  }
  
  const handleFocus = () => {
    if (disabled) return;
    setSearchTerm(selectedOption?.name || '');
    setIsOpen(true);
  };

  const displayValue = isOpen ? searchTerm : (selectedOption?.name || '');
  
  return (
    <div className="relative" ref={selectRef}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`${formInputSmallClass} ${error ? 'border-red-500' : ''}`}
        aria-invalid={error}
      />
      {isOpen && !disabled && (
        <ul className="absolute z-20 w-full bg-white border border-slate-300 text-slate-900 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {filteredOptions.map(option => (
              <li
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className="px-3 py-2 cursor-pointer hover:bg-indigo-100 text-sm"
              >
                {option.name}
              </li>
            ))
          }
           {filteredOptions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Sonuç bulunamadı</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
