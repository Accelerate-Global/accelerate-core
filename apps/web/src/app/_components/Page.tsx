import type { ReactNode } from "react";

export function Page(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="page">
      <header className="pageHeader">
        <h1 className="pageTitle">{props.title}</h1>
        {props.description ? <p className="pageDescription muted">{props.description}</p> : null}
      </header>
      <div className="pageBody">{props.children}</div>
    </div>
  );
}

