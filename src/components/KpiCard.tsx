import './KpiCard.css';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'magenta';
}

export function KpiCard({ title, value, subtitle, color = 'blue' }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${color}`}>
      <h3 className="kpi-card__title">{title}</h3>
      <div className="kpi-card__value">{value}</div>
      {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}
    </div>
  );
}
