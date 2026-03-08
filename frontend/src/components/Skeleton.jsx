export default function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`.trim()} style={style} />;
}
