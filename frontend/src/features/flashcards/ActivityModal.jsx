import { useEffect, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { getActivity } from "../../services/flashcardsService.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export default function ActivityModal({ onClose }) {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getActivity(30)
			.then((d) => setData(d ?? []))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const max = Math.max(...data.map((d) => d.count), 1);
	const total = data.reduce((s, d) => s + d.count, 0);
	const activeDays = data.filter((d) => d.count > 0).length;
	const best = Math.max(...data.map((d) => d.count));

	return (
		<Modal open onClose={onClose}>
			<h2 className="px-1 text-2xl font-bold text-title">Activity</h2>
			<p className="mt-1 px-1 text-sm text-body">Last 30 days</p>

			{/* Summary row */}
			<div className="mt-4 flex gap-3">
				{[
					{ label: "Total reviews", value: total },
					{ label: "Active days", value: activeDays },
					{ label: "Best day", value: best },
				].map((s) => (
					<div
						key={s.label}
						className="flex-1 rounded-2xl bg-bg-secondary px-4 py-3 text-center"
					>
						<p className="text-xl font-bold text-title">{s.value}</p>
						<p className="text-[11px] text-body mt-0.5">{s.label}</p>
					</div>
				))}
			</div>

			{/* Bar chart */}
			<div className="mt-5">
				{loading ? (
					<div className="flex h-32 items-center justify-center text-sm text-body">
						Loading…
					</div>
				) : (
					<>
						<div className="flex items-end gap-[3px] h-32">
							{data.map((d, i) => {
								const height =
									d.count === 0 ? 2 : Math.max(8, (d.count / max) * 112);
								const date = new Date(`${d.date}T12:00:00`);
								return (
									<div
										key={d.date}
										className="group relative flex-1 flex flex-col items-center justify-end"
									>
										{/* Tooltip */}
										<div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
											<div className="rounded-lg bg-title px-2 py-1 text-[10px] text-bg whitespace-nowrap">
												{d.count} card{d.count !== 1 ? "s" : ""}
												<br />
												<span className="opacity-60">
													{MONTH_LABELS[date.getMonth()]} {date.getDate()}
												</span>
											</div>
											<div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-title" />
										</div>
										<div
											style={{ height }}
											className={`w-full rounded-sm transition-all ${
												d.isToday
													? "bg-folder-blue"
													: d.count > 0
														? "bg-folder-blue/40"
														: "bg-border-soft"
											}`}
										/>
									</div>
								);
							})}
						</div>

						{/* Date labels — every 5 days + today */}
						<div className="flex mt-1.5">
							{data.map((d, i) => {
								const date = new Date(`${d.date}T12:00:00`);
								const show = i % 5 === 0 || d.isToday;
								return (
									<div key={d.date} className="flex-1 text-center">
										{show && (
											<span
												className={`text-[9px] leading-tight ${d.isToday ? "font-bold text-folder-blue" : "text-body"}`}
											>
												{date.getDate()}
												<br />
												{MONTH_LABELS[date.getMonth()]}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</>
				)}
			</div>

			<button
				type="button"
				onClick={onClose}
				className="mt-5 w-full py-1 font-medium text-title"
			>
				Close
			</button>
		</Modal>
	);
}
