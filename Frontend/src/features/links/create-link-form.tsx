"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/20/solid";
import { createShortLink } from "@/lib/links-api";
import type { CreatedLink, CreateLinkPayload } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type CreateLinkFormProps = {
  onCreated: (link: CreatedLink) => void;
};

type FormState = {
  targetUrl: string;
  customCode: string;
  title: string;
  description: string;
  tags: string;
  expiresAt: string;
};

const initialState: FormState = {
  targetUrl: "",
  customCode: "",
  title: "",
  description: "",
  tags: "",
  expiresAt: ""
};

function toPayload(state: FormState): CreateLinkPayload {
  return {
    targetUrl: state.targetUrl.trim(),
    customCode: state.customCode.trim() || undefined,
    title: state.title.trim() || undefined,
    description: state.description.trim() || undefined,
    tags: state.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    expiresAt: state.expiresAt ? new Date(state.expiresAt).toISOString() : undefined
  };
}

export function CreateLinkForm({ onCreated }: CreateLinkFormProps) {
  const [state, setState] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const targetUrlError = useMemo(() => {
    if (!state.targetUrl) return undefined;

    try {
      const url = new URL(state.targetUrl);
      return ["http:", "https:"].includes(url.protocol) ? undefined : "Use http or https.";
    } catch {
      return "Enter a valid URL.";
    }
  }, [state.targetUrl]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!state.targetUrl || targetUrlError) {
      setError("Add a valid destination URL before creating a short link.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createShortLink(toPayload(state));
      onCreated(created);
      setState(initialState);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while creating the link."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Field
        id="targetUrl"
        label="Destination URL"
        placeholder="https://example.com/very/long/path"
        value={state.targetUrl}
        error={targetUrlError}
        onChange={(event) => setState((current) => ({ ...current, targetUrl: event.target.value }))}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="customCode"
          label="Custom code"
          placeholder="launch"
          hint="Optional, 4-32 letters, numbers, dashes, or underscores."
          value={state.customCode}
          onChange={(event) =>
            setState((current) => ({ ...current, customCode: event.target.value }))
          }
        />
        <Field
          id="expiresAt"
          label="Expiration"
          type="datetime-local"
          value={state.expiresAt}
          onChange={(event) =>
            setState((current) => ({ ...current, expiresAt: event.target.value }))
          }
        />
      </div>
      <Field
        id="title"
        label="Title"
        placeholder="Spring campaign"
        value={state.title}
        onChange={(event) => setState((current) => ({ ...current, title: event.target.value }))}
      />
      <Field
        id="description"
        label="Description"
        placeholder="Internal note for this short link"
        value={state.description}
        multiline
        onChange={(event) =>
          setState((current) => ({ ...current, description: event.target.value }))
        }
      />
      <Field
        id="tags"
        label="Tags"
        placeholder="campaign, docs, launch"
        hint="Separate tags with commas."
        value={state.tags}
        onChange={(event) => setState((current) => ({ ...current, tags: event.target.value }))}
      />
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <Button className="w-full sm:w-auto" type="submit" loading={submitting} icon={<PlusIcon className="h-4 w-4" />}>
        Create short link
      </Button>
    </form>
  );
}
