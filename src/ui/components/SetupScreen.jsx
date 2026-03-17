/**
 * @param {{ title: string, sub: string }} props
 */
export function SetupScreen({ title, sub }) {
    return (
        <>
            <div className="setup-spinner" />
            <div className="setup-title">{title}</div>
            <div className="setup-sub">{sub}</div>
        </>
    );
}