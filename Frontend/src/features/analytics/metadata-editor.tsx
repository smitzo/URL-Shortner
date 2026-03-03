"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { updateLinkMetadata } from "@/lib/links-api";
import type { PublicLink } from "@/types/api";

type MetadataEditorProps = {
  link: PublicLink | null;
  adminKey: string;
  enabled: boolean;
  onUpdated: (link: PublicLink) => void;
};

export function MetadataEditor({ link, adminKey, enabled, onUpdated }: MetadataEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(link?.title ?? "");
    setDescription(link?.description ?? "");
    setTags(link?.tags.join(", ") ?? "");
    setExpiresAt(link?.expiresAt ? link.expiresAt.slice(0, 16) : "");
  }, [link]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!link) return;

    setSaving(true);
    setMessage(null);

    try {
      const updated = await updateLinkMetadata(link.code, adminKey, {
        title: title.trim() || null,
        description: description.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      });
      onUpdated(updated);
      setMessage("Metadata saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save metadata.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Metadata" description="Edit safe owner-managed fields without changing the destination.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          id="metadataTitle"
          label="Title"
          value={title}
          disabled={!enabled || !link}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Field
          id="metadataDescription"
          label="Description"
          value={description}
          disabled={!enabled || !link}
          multiline
          onChange={(event) => setDescription(event.target.value)}
        />
        <Field
          id="metadataTags"
          label="Tags"
          value={tags}
          disabled={!enabled || !link}
          hint="Separate tags with commas."
          onChange={(event) => setTags(event.target.value)}
        />
        <Field
          id="metadataExpiresAt"
          label="Expiration"
          type="datetime-local"
          value={expiresAt}
          disabled={!enabled || !link}
          onChange={(event) => setExpiresAt(event.target.value)}
        />
        {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
        <Button type="submit" loading={saving} disabled={!enabled || !link} icon={<CheckIcon className="h-4 w-4" />}>
          Save metadata
        </Button>
      </form>
    </Panel>
  );
}
