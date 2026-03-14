'use client';

import * as React from 'react';
import { format, startOfToday, subDays, startOfMonth, endOfToday, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';

export function RangePicker({
  className,
  onChange,
  value,
  bordered = true,
}: {
  className?: string;
  onChange?: (date: DateRange | undefined) => void;
  value?: DateRange;
  bordered?: boolean;
}) {
  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(value);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(value);
  const [open, setOpen] = React.useState(false);

  const normalizeRange = (range: DateRange | undefined): DateRange | undefined => {
    if (!range?.from) return undefined;
    const from = startOfDay(range.from);
    const to = range.to ? endOfDay(range.to) : undefined;
    return { from, to };
  };

  const handleApply = () => {
    const normalized = normalizeRange(tempDate);
    setSelectedDate(normalized);
    onChange?.(normalized);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempDate(selectedDate);
    setOpen(false);
  };

  const handleClear = () => {
    setTempDate(undefined);
    setSelectedDate(undefined);
    onChange?.(undefined);
    setOpen(false);
  };

  const applyPreset = (range: DateRange) => {
    const normalized = normalizeRange(range);
    setTempDate(normalized);
    setSelectedDate(normalized);
    onChange?.(normalized);
    setOpen(false);
  };

  const presets = [
    {
      label: 'Today',
      range: { from: startOfToday(), to: endOfToday() },
    },
    {
      label: 'Last 7 Days',
      range: { from: subDays(startOfToday(), 6), to: endOfToday() },
    },
    {
      label: 'This Month',
      range: { from: startOfMonth(new Date()), to: endOfToday() },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !selectedDate?.from && 'text-muted-foreground',
            !bordered && 'border-none bg-inherit w-fit',
            className
          )}
        >
          {bordered && <CalendarIcon className="mr-2 h-4 w-4" />}
          {selectedDate?.from ? (
            selectedDate.to ? (
              <>
                {format(selectedDate.from, 'PPP')} - {format(selectedDate.to, 'PPP')}
              </>
            ) : (
              format(selectedDate.from, 'PPP')
            )
          ) : (
            <span>Select date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end">
        <div className="flex gap-4">
          <div className="flex flex-col border-r pr-4 space-y-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="justify-start px-2 py-1 text-sm"
                onClick={() => applyPreset(preset.range)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Calendar mode="range" selected={tempDate} onSelect={setTempDate} numberOfMonths={2} />
        </div>

        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-primary text-white hover:bg-primary/90">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
