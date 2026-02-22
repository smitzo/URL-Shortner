import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BaseFieldProps = {
  label: string;
  error?: string;
  hint?: string;
};

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

type FieldProps = InputFieldProps | TextareaFieldProps;

const controlClass =
  "mt-2 w-full rounded-md border-slate-300 bg-white text-sm text-ink-950 shadow-sm transition placeholder:text-slate-400 focus:border-signal-500 focus:ring-signal-500 disabled:cursor-not-allowed disabled:bg-slate-100";

export function Field(props: FieldProps) {
  const { label, error, hint, className, multiline, ...controlProps } = props;
  const describedBy = error ? `${controlProps.id}-error` : hint ? `${controlProps.id}-hint` : undefined;

  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      {multiline ? (
        <textarea
          className={cn(controlClass, "min-h-24 resize-y", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...(controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={cn(controlClass, className)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...(controlProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error ? (
        <span id={`${controlProps.id}-error`} className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${controlProps.id}-hint`} className="mt-1 block text-xs text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
