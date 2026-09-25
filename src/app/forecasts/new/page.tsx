"use client";

import Link from "next/link";
import { useState } from "react";

interface ForecastFormData {
  location: string;
  validTime: string;
  hypothesis: string;
  evidence: string[];
  confidence: number;
}

export default function NewForecastPage() {
  const [formData, setFormData] = useState<ForecastFormData>({
    location: "",
    validTime: "",
    hypothesis: "",
    evidence: [""],
    confidence: 50,
  });

  const [currentTab, setCurrentTab] = useState<
    "location" | "evidence" | "hypothesis" | "review"
  >("location");

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, location: e.target.value });
  };

  const handleValidTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, validTime: e.target.value });
  };

  const handleHypothesisChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, hypothesis: e.target.value });
  };

  const handleEvidenceChange = (
    index: number,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newEvidence = [...formData.evidence];
    newEvidence[index] = e.target.value;
    setFormData({ ...formData, evidence: newEvidence });
  };

  const addEvidenceField = () => {
    setFormData({ ...formData, evidence: [...formData.evidence, ""] });
  };

  const removeEvidenceField = (index: number) => {
    setFormData({
      ...formData,
      evidence: formData.evidence.filter((_, i) => i !== index),
    });
  };

  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, confidence: Number(e.target.value) });
  };

  const isLocationComplete = formData.location && formData.validTime;
  const isEvidenceComplete = formData.evidence.some((e) => e.trim());
  const isHypothesisComplete = formData.hypothesis.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-sky-100">
      {/* Header */}
      <header className="border-b border-sky-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-sky-900">
                Create New Forecast
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Evidence-based weather forecasting process
              </p>
            </div>
            <Link
              href="/forecasts"
              className="rounded-lg border border-sky-300 px-4 py-2 text-sky-700 hover:bg-sky-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8 flex border-b border-sky-200">
          <button
            onClick={() => setCurrentTab("location")}
            className={`px-4 py-2 font-semibold ${
              currentTab === "location"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-gray-600 hover:text-sky-600"
            }`}
          >
            📍 Location & Time
            {isLocationComplete && <span className="ml-2">✓</span>}
          </button>
          <button
            onClick={() => setCurrentTab("evidence")}
            className={`px-4 py-2 font-semibold ${
              currentTab === "evidence"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-gray-600 hover:text-sky-600"
            }`}
          >
            🔍 Evidence Panel
            {isEvidenceComplete && <span className="ml-2">✓</span>}
          </button>
          <button
            onClick={() => setCurrentTab("hypothesis")}
            className={`px-4 py-2 font-semibold ${
              currentTab === "hypothesis"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-gray-600 hover:text-sky-600"
            }`}
          >
            💭 Hypothesis
            {isHypothesisComplete && <span className="ml-2">✓</span>}
          </button>
          <button
            onClick={() => setCurrentTab("review")}
            className={`px-4 py-2 font-semibold ${
              currentTab === "review"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-gray-600 hover:text-sky-600"
            }`}
          >
            📊 Review & Publish
          </button>
        </div>

        {/* Location & Time Tab */}
        {currentTab === "location" && (
          <div className="space-y-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-sky-900">
                Forecast Location
              </label>
              <input
                type="text"
                placeholder="e.g., Northeast United States, Pacific Northwest"
                value={formData.location}
                onChange={handleLocationChange}
                className="mt-2 w-full rounded-lg border border-sky-200 px-4 py-2 focus:border-sky-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-sky-900">
                Valid Time Period
              </label>
              <input
                type="datetime-local"
                value={formData.validTime}
                onChange={handleValidTimeChange}
                className="mt-2 w-full rounded-lg border border-sky-200 px-4 py-2 focus:border-sky-600 focus:outline-none"
              />
            </div>

            <div className="rounded-lg bg-sky-50 p-4">
              <p className="text-sm text-gray-700">
                ℹ️ Specify the location and time period for which this forecast
                is valid.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCurrentTab("evidence")}
                disabled={!isLocationComplete}
                className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white disabled:bg-gray-400 hover:bg-sky-700"
              >
                Next: Add Evidence →
              </button>
            </div>
          </div>
        )}

        {/* Evidence Panel Tab */}
        {currentTab === "evidence" && (
          <div className="space-y-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-sky-900">
                Atmospheric Evidence
              </label>
              <p className="mt-1 text-sm text-gray-600">
                Document observations and data supporting your forecast.
              </p>
            </div>

            <div className="space-y-4">
              {formData.evidence.map((evidence, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={evidence}
                    onChange={(e) => handleEvidenceChange(index, e)}
                    placeholder={`Evidence ${index + 1}: Satellite data, surface observations, model output, etc.`}
                    className="flex-1 rounded-lg border border-sky-200 px-4 py-2 focus:border-sky-600 focus:outline-none"
                    rows={3}
                  />
                  {formData.evidence.length > 1 && (
                    <button
                      onClick={() => removeEvidenceField(index)}
                      className="rounded-lg bg-red-50 px-4 py-2 text-red-600 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addEvidenceField}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sky-700 hover:bg-sky-50"
            >
              + Add Another Evidence Item
            </button>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => setCurrentTab("location")}
                className="rounded-lg border border-sky-300 px-6 py-2 font-semibold text-sky-700 hover:bg-sky-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentTab("hypothesis")}
                disabled={!isEvidenceComplete}
                className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white disabled:bg-gray-400 hover:bg-sky-700"
              >
                Next: Form Hypothesis →
              </button>
            </div>
          </div>
        )}

        {/* Hypothesis Tab */}
        {currentTab === "hypothesis" && (
          <div className="space-y-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-sky-900">
                Forecast Hypothesis
              </label>
              <p className="mt-1 text-sm text-gray-600">
                State your weather hypothesis based on the evidence you've
                gathered.
              </p>
            </div>

            <textarea
              value={formData.hypothesis}
              onChange={handleHypothesisChange}
              placeholder="Describe your forecast hypothesis..."
              className="w-full rounded-lg border border-sky-200 px-4 py-2 focus:border-sky-600 focus:outline-none"
              rows={6}
            />

            <div>
              <label className="block text-sm font-semibold text-sky-900">
                Confidence Level: {formData.confidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.confidence}
                onChange={handleConfidenceChange}
                className="mt-2 w-full"
              />
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => setCurrentTab("evidence")}
                className="rounded-lg border border-sky-300 px-6 py-2 font-semibold text-sky-700 hover:bg-sky-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentTab("review")}
                disabled={!isHypothesisComplete}
                className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white disabled:bg-gray-400 hover:bg-sky-700"
              >
                Next: Review & Publish →
              </button>
            </div>
          </div>
        )}

        {/* Review & Publish Tab */}
        {currentTab === "review" && (
          <div className="space-y-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-sky-900">Review Forecast</h2>
              <p className="mt-1 text-sm text-gray-600">
                Verify all information before publishing your forecast.
              </p>
            </div>

            {/* Location Summary */}
            <div className="rounded-lg bg-sky-50 p-4">
              <h3 className="font-semibold text-sky-900">📍 Location & Time</h3>
              <p className="mt-2 text-gray-700">
                <strong>Location:</strong> {formData.location || "Not specified"}
              </p>
              <p className="text-gray-700">
                <strong>Valid Time:</strong> {formData.validTime || "Not specified"}
              </p>
            </div>

            {/* Evidence Summary */}
            <div className="rounded-lg bg-sky-50 p-4">
              <h3 className="font-semibold text-sky-900">🔍 Evidence</h3>
              <ul className="mt-2 space-y-2">
                {formData.evidence.map(
                  (evidence, index) =>
                    evidence.trim() && (
                      <li key={index} className="text-gray-700">
                        <strong>{index + 1}.</strong> {evidence}
                      </li>
                    )
                )}
              </ul>
            </div>

            {/* Hypothesis Summary */}
            <div className="rounded-lg bg-sky-50 p-4">
              <h3 className="font-semibold text-sky-900">💭 Hypothesis</h3>
              <p className="mt-2 text-gray-700">{formData.hypothesis}</p>
              <p className="mt-2 text-gray-700">
                <strong>Confidence:</strong> {formData.confidence}%
              </p>
            </div>

            <div className="flex justify-between gap-4">
              <button
                onClick={() => setCurrentTab("hypothesis")}
                className="rounded-lg border border-sky-300 px-6 py-2 font-semibold text-sky-700 hover:bg-sky-50"
              >
                ← Back
              </button>
              <button className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white hover:bg-sky-700">
                ✓ Publish Forecast
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
