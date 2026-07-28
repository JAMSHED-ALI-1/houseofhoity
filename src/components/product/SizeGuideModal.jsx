"use client";

import { useEffect } from "react";

function getFirstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeName(value) {
  return String(value || "").trim();
}

function getMeasureLines(value = {}) {
  const measureLines = Array.isArray(value.measure_lines) ? value.measure_lines : [];
  const ageMeasures = Array.isArray(value.age_measures) ? value.age_measures : [];

  return (measureLines.length > 0 ? measureLines : ageMeasures).filter((measure) => (
    measure?.status === undefined ||
    measure?.status === null ||
    String(measure.status).toLowerCase() === "active"
  ));
}

function formatUnit(unit) {
  const normalizedUnit = String(unit || "").toLowerCase();

  if (normalizedUnit === "centimeter" || normalizedUnit === "centimeters") return "cm";
  if (normalizedUnit === "inch" || normalizedUnit === "inches") return "in";

  return unit || "";
}

function formatMeasureValue(measure) {
  if (!measure) return "-";

  const unit = formatUnit(measure.size_unit || measure.unit);
  const value = getFirstValue(measure.value, measure.measure_value, measure.size, measure.length);

  if (value === undefined || value === null || value === "") return "-";

  return `${value}${unit ? ` ${unit}` : ""}`;
}

function buildSizeGuide(product = {}) {
  const attributeLines = Array.isArray(product.attribute_lines) ? product.attribute_lines : [];
  const measuredLine = attributeLines.find((line) => (
    Array.isArray(line.values) &&
    line.values.some((value) => getMeasureLines(value).length > 0)
  ));
  const line = measuredLine || attributeLines.find((item) => Array.isArray(item.values) && item.values.length > 0);
  const values = Array.isArray(line?.values) ? line.values : [];
  const attributeName = normalizeName(line?.attribute_name || line?.name || line?.attribute) || "Size";
  const columns = [];

  values.forEach((value) => {
    getMeasureLines(value).forEach((measure) => {
      const name = normalizeName(measure.measure_name || measure.name || measure.label);

      if (name && !columns.includes(name)) {
        columns.push(name);
      }
    });
  });

  const rows = values.map((value, index) => {
    const measures = getMeasureLines(value);
    const measuresByName = new Map(
      measures.map((measure) => [
        normalizeName(measure.measure_name || measure.name || measure.label),
        measure,
      ]),
    );

    return {
      id: getFirstValue(value.id, value.value_id, value.name, index),
      label: normalizeName(getFirstValue(value.name, value.value_name, value.value, value.label)) || `Option ${index + 1}`,
      values: columns.map((column) => formatMeasureValue(measuresByName.get(column))),
    };
  });

  return {
    attributeName,
    columns,
    rows,
  };
}

function getTipText(measureName) {
  const name = String(measureName || "").toLowerCase();

  if (name.includes("chest") || name.includes("bust")) {
    return "Measure around the fullest part of the chest.";
  }

  if (name.includes("waist")) {
    return "Measure around the natural waistline.";
  }

  if (name.includes("hip")) {
    return "Measure around the fullest part of the hips.";
  }

  if (name.includes("shoulder") || name.includes("length") || name.includes("gown")) {
    return "Measure straight down from the shoulder point.";
  }

  return "Measure gently with the tape flat against the body.";
}

export default function SizeGuideModal({ product, onClose }) {
  const guide = buildSizeGuide(product);
  const hasGuide = guide.columns.length > 0 && guide.rows.length > 0;
  const tipColumns = guide.columns.slice(0, 4);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10020] grid place-items-center bg-black/60 px-3 py-6 sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
      onMouseDown={onClose}
    >
      <div
        className="relative max-h-full w-full max-w-[1120px] overflow-y-auto bg-white p-5 text-[#515c5a] shadow-2xl sm:p-8 lg:p-11"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-10 place-items-center border border-[#ddd] text-2xl leading-none text-[#222] transition hover:bg-[#222] hover:text-white sm:right-5 sm:top-5"
          aria-label="Close size guide"
        >
          x
        </button>

        <h2 id="size-guide-title" className="text-center text-3xl font-medium tracking-[0.18em] text-[#515c5a] sm:text-4xl">
          Size guide
        </h2>

        {hasGuide ? (
          <>
            <div className="mt-8 overflow-x-auto border border-[#dedede]">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm sm:text-base">
                <thead>
                  <tr className="bg-[#fbfbfb] text-[#8b8b8b]">
                    <th className="border-b border-r border-[#dedede] px-4 py-4 font-bold sm:px-5">
                      {guide.attributeName}
                    </th>
                    {guide.columns.map((column) => (
                      <th key={column} className="border-b border-r border-[#dedede] px-4 py-4 font-bold last:border-r-0 sm:px-5">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row) => (
                    <tr key={row.id} className="text-[#8d8d8d]">
                      <td className="border-b border-r border-[#dedede] px-4 py-4 font-semibold last:border-b-0 sm:px-5">
                        {row.label}
                      </td>
                      {row.values.map((value, index) => (
                        <td key={`${row.id}-${guide.columns[index]}`} className="border-b border-r border-[#dedede] px-4 py-4 font-semibold last:border-r-0 sm:px-5">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <h3 className="text-2xl font-medium tracking-[0.16em] text-[#515c5a] sm:text-3xl">
                  Measuring Tips
                </h3>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {tipColumns.map((column) => (
                    <div key={column}>
                      <p className="text-lg font-medium tracking-[0.14em] text-[#515c5a]">
                        {column}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-[#969696]">
                        {getTipText(column)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-auto w-full max-w-[280px]">
                <div className="relative mx-auto h-[300px] w-[190px] bg-[#e3e3e3] [clip-path:polygon(30%_0,70%_0,84%_18%,100%_38%,84%_45%,74%_100%,26%_100%,16%_45%,0_38%,16%_18%)]">
                  <div className="absolute left-1/2 top-0 h-10 w-16 -translate-x-1/2 rounded-b-full bg-white" />
                  {tipColumns.slice(0, 3).map((column, index) => (
                    <div
                      key={column}
                      className="absolute left-1/2 h-px -translate-x-1/2 bg-[#333]"
                      style={{ top: `${38 + index * 24}%`, width: `${72 - index * 4}%` }}
                    >
                      <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold lowercase text-[#4d4d4d]">
                        {column}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-9 border border-[#dedede] px-5 py-10 text-center">
            <p className="text-base font-semibold text-[#777]">
              Size measurements are not available for this product.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
