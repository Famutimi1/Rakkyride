"use client";
import { useState } from "react";
import type { EmailPreferences } from "@/contracts/admin";
import { ConfirmAction } from "./confirm-action";

export function EmailPreferencesEditor({settings,editable}:{settings:EmailPreferences;editable:boolean}){
  const [enabled,setEnabled]=useState(settings.enabled);
  const [rules,setRules]=useState({...settings.rules});
  const changes=settings.controls.filter(control=>rules[control.key]!==settings.rules[control.key]);
  const changed=enabled!==settings.enabled||changes.length>0;
  const toggle=(key:string)=>setRules(current=>({...current,[key]:!current[key]}));
  return <div className="email-preferences">
    <p className="muted">Choose which emails Rakky Ride sends. Turning a type off skips its pending and future messages. Turning it back on applies to new events; skipped messages stay skipped. An email already being sent may still arrive.</p>
    {!editable&&<p className="panel-note">Only a super-admin can change these preferences.</p>}
    <div className="email-control email-control-master">
      <div><h3 id="email-master-label">Allow email sending</h3><p id="email-master-description">Master switch for all email types, including administrative test emails. Provider credentials and EMAIL_ENABLED must also be configured.</p></div>
      <button type="button" role="switch" aria-labelledby="email-master-label" aria-describedby="email-master-description" aria-checked={enabled} className="email-toggle" disabled={!editable} onClick={()=>setEnabled(value=>!value)}><span aria-hidden="true" className="email-toggle-track"><span/></span>{enabled?'On':'Off'}</button>
    </div>
    <div className="email-control-groups">{[...new Set(settings.controls.map(control=>control.group))].map(group=><fieldset key={group}><legend>{group}</legend>{settings.controls.filter(control=>control.group===group).map(control=><div className="email-control" key={control.key}>
      <div><h3 id={`email-${control.key}-label`}>{control.label}</h3><p id={`email-${control.key}-description`}>{control.description}</p></div>
      <button type="button" role="switch" aria-labelledby={`email-${control.key}-label`} aria-describedby={`email-${control.key}-description`} aria-checked={rules[control.key]===true} className="email-toggle" disabled={!editable} onClick={()=>toggle(control.key)}><span aria-hidden="true" className="email-toggle-track"><span/></span>{rules[control.key]?'On':'Off'}</button>
    </div>)}</fieldset>)}</div>
    {!enabled&&<p className="panel-note">The master switch is off. Individual choices are saved for when you turn email sending back on.</p>}
    {editable&&<ConfirmAction title="Save email preferences" label="Save email preferences" description="Apply these sending choices across the app. Disabled types skip unsent messages; previously attempted messages with an unknown outcome are held for review. A reason is required and concurrent changes are rejected." path="emails/preferences" method="PATCH" payload={{enabled,rules,expectedVersion:settings.version}} disabled={!changed}>
      <dl className="definition-list">{enabled!==settings.enabled&&<div><dt>All email sending</dt><dd>{settings.enabled?'On':'Off'} → {enabled?'On':'Off'}</dd></div>}{changes.map(control=><div key={control.key}><dt>{control.label}</dt><dd>{settings.rules[control.key]?'On':'Off'} → {rules[control.key]?'On':'Off'}</dd></div>)}</dl>
    </ConfirmAction>}
  </div>;
}
