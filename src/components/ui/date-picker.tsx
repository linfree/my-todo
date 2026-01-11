import { forwardRef, useState, useEffect, useRef, useImperativeHandle } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "../../lib/utils";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./date-picker.css";

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  showTime?: boolean;
  showSeconds?: boolean;
}

export interface DatePickerRef {
  setOpen: (open: boolean) => void;
}

const DatePicker = forwardRef<DatepickerRef, DatePickerProps>(
  ({ value, onChange, placeholder = "选择日期时间", className, showTime = true, showSeconds = false }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const datePickerRef = useRef<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setOpen: (open: boolean) => {
        setIsOpen(open);
      }
    }));

    // 点击外部关闭弹窗
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          isOpen &&
          popupRef.current &&
          !popupRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const hours = value?.getHours() ?? 0;
    const minutes = value?.getMinutes() ?? 0;
    const seconds = value?.getSeconds() ?? 0;

    // 格式化显示
    const formatDisplay = (date: Date | null): string => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hrs = String(date.getHours()).padStart(2, "0");
      const mins = String(date.getMinutes()).padStart(2, "0");
      const secs = String(date.getSeconds()).padStart(2, "0");

      if (showTime) {
        return showSeconds
          ? `${year}-${month}-${day} ${hrs}:${mins}:${secs}`
          : `${year}-${month}-${day} ${hrs}:${mins}`;
      }
      return `${year}-${month}-${day}`;
    };

    // 解析输入
    const parseInput = (input: string): Date | null => {
      if (!input.trim()) return null;

      const patterns = [
        /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      ];

      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          const [, year, month, day, hr, min, sec] = match;
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            hr ? parseInt(hr) : 0,
            min ? parseInt(min) : 0,
            sec ? parseInt(sec) : 0
          );
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return null;
    };

    // 处理输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      const parsedDate = parseInput(newValue);
      if (parsedDate) {
        onChange(parsedDate);
      }
    };

    // 处理输入框失去焦点
    const handleInputBlur = () => {
      if (!inputValue) {
        onChange(null);
        return;
      }
      const parsedDate = parseInput(inputValue);
      if (parsedDate) {
        onChange(parsedDate);
        setInputValue(formatDisplay(parsedDate));
      } else {
        setInputValue(formatDisplay(value ?? null));
      }
    };

    // 处理日期变化
    const handleDateChange = (date: Date | null) => {
      if (date) {
        const newDate = value ? new Date(value) : new Date();
        newDate.setFullYear(date.getFullYear());
        newDate.setMonth(date.getMonth());
        newDate.setDate(date.getDate());
        newDate.setHours(hours, minutes, seconds);
        onChange(newDate);
        setInputValue(formatDisplay(newDate));
      } else {
        onChange(null);
        setInputValue("");
      }
    };

    // 处理小时变化
    const handleHoursChange = (newHours: number) => {
      if (value) {
        const newDate = new Date(value);
        newDate.setHours(newHours);
        onChange(newDate);
        setInputValue(formatDisplay(newDate));
      }
    };

    // 处理分钟变化
    const handleMinutesChange = (newMinutes: number) => {
      if (value) {
        const newDate = new Date(value);
        newDate.setMinutes(newMinutes);
        onChange(newDate);
        setInputValue(formatDisplay(newDate));
      }
    };

    // 处理秒变化
    const handleSecondsChange = (newSeconds: number) => {
      if (value) {
        const newDate = new Date(value);
        newDate.setSeconds(newSeconds);
        onChange(newDate);
        setInputValue(formatDisplay(newDate));
      }
    };

    // 清除
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setInputValue("");
    };

    // 同步输入框值
    useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setInputValue(formatDisplay(value ?? null));
      }
    }, [value]);

    return (
      <div className={cn("relative group", className)}>
        {/* 输入框 */}
        <div className="relative" onClick={() => setIsOpen(true)}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={() => setInputValue(formatDisplay(value ?? null))}
            placeholder={placeholder}
            readOnly={false}
            className={cn(
              "w-full rounded-xl border-2 border-border/60 bg-background/50",
              "px-4 py-3 pr-24 text-base",
              "transition-all duration-200",
              "hover:border-border hover:bg-background/80",
              "focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-background focus:outline-none",
              "shadow-sm hover:shadow-md",
              "text-foreground placeholder:text-muted-foreground font-mono"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "p-1 rounded-md hover:bg-muted transition-colors",
                  "text-muted-foreground hover:text-foreground pointer-events-auto"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Calendar className="w-4 h-4 text-muted-foreground/60" />
          </div>
        </div>

        {/* 日期时间选择器弹窗 */}
        {isOpen && (
          <div className="absolute z-50 mt-2" style={{ minWidth: "320px" }} ref={popupRef}>
            <div className="custom-datepicker-with-time">
              {/* 自定义头部 */}
              <div className="custom-datepicker-header">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // 月份导航由 ReactDatePicker 内部处理
                  }}
                  type="button"
                  className="custom-datepicker-nav"
                >
                  ‹
                </button>
                <span className="custom-datepicker-month">
                  {value ? value.toLocaleDateString("zh-CN", { year: "numeric", month: "long" }) : new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // 月份导航由 ReactDatePicker 内部处理
                  }}
                  type="button"
                  className="custom-datepicker-nav"
                >
                  ›
                </button>
              </div>

              {/* 日历 */}
              <ReactDatePicker
                ref={datePickerRef}
                selected={value}
                onChange={handleDateChange}
                inline
                calendarClassName="inline-calendar"
                renderCustomHeader={() => <></>}
              />

              {/* 时间选择器 */}
              {showTime && (
                <div className="datepicker-time-panel">
                  <div className="datepicker-time-row">
                    <label>时</label>
                    <select value={hours} onChange={(e) => handleHoursChange(Number(e.target.value))}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="datepicker-time-row">
                    <label>分</label>
                    <select value={minutes} onChange={(e) => handleMinutesChange(Number(e.target.value))}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                  {showSeconds && (
                    <div className="datepicker-time-row">
                      <label>秒</label>
                      <select value={seconds} onChange={(e) => handleSecondsChange(Number(e.target.value))}>
                        {Array.from({ length: 60 }, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 mt-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

export { DatePicker };

type DatepickerRef = any;
