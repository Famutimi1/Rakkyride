"use client";
import { useState } from "react";
import type { EmailTemplatePreview } from "@/contracts/admin";
import { FormField } from "./ui/filter-toolbar";
import { statusLabel } from "@/lib/format";

export function EmailTemplatePreviewer({templates}:{templates:EmailTemplatePreview[]}){
  const [selected,setSelected]=useState(templates[0]?.template??"");
  const [width,setWidth]=useState("desktop");
  const template=templates.find(item=>item.template===selected);
  if(!template)return null;
  return <>
    <div className="filter-bar">
      <FormField label="Template"><select value={selected} onChange={event=>setSelected(event.target.value)}>{templates.map(item=><option key={item.template} value={item.template}>{statusLabel(item.template)}</option>)}</select></FormField>
      <FormField label="Preview width"><select value={width} onChange={event=>setWidth(event.target.value)}><option value="desktop">Desktop</option><option value="mobile">Mobile · 375px</option></select></FormField>
    </div>
    <p className="panel-note"><strong>{template.subject}</strong><br/>Template version {template.version}. Preview customer data only. Links are disabled in this isolated preview.</p>
    <div className="email-preview-shell" data-width={width}><iframe title={`${statusLabel(template.template)} email preview`} sandbox="" srcDoc={template.html} className="email-preview-frame" referrerPolicy="no-referrer" /></div>
    <details className="panel-note"><summary>Plain-text version</summary><pre className="email-text-preview">{template.text}</pre></details>
  </>;
}
