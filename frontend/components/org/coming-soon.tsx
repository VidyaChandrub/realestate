import { Reveal } from "@/components/superadmin/reveal";
import { Icon, type IconName } from "@/components/icons";

export function ComingSoon({
  title,
  icon,
  description,
}: {
  title: string;
  icon: IconName;
  description: string;
}) {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name={icon} size={14} /> {title}</div>
          <h1>{title}</h1>
          <div className="sub">{description}</div>
        </div>
      </div>
      <Reveal delay={1}>
        <div className="card">
          <div className="card-b" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ marginBottom: 12, display:"flex", justifyContent:"center"}}><Icon name={icon} size={40} /></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Coming soon</div>
            <p className="muted">{description}</p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
