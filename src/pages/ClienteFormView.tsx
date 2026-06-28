/**
 * ClienteFormView — formulario para crear un nuevo cliente.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCliente } from "../api/trabajos";
import { ArrowLeft, Check, User, Phone, MapPin } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function ClienteFormView({ onBack }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    telefono_principal: "",
    email: "",
    direccion_calle: "",
    direccion_numero: "",
    direccion_municipio: "",
    direccion_provincia: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createCliente(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setSuccess(true);
      setTimeout(() => onBack(), 1200);
    },
    onError: (e: Error) => setError(e.message),
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError("");
    mutation.mutate();
  };

  const textColor = "var(--tg-theme-text_color)";
  const hintColor = "var(--tg-theme-hint_color)";
  const accentColor = "var(--tg-theme-accent_text_color)";
  const bgColor = "var(--tg-theme-secondary_bg_color)";
  const inputBg = "var(--tg-theme-bg_color)";

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center p-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--tg-theme-button_color)", opacity: 0.15 }}>
            <Check className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold" style={{ color: textColor }}>Cliente creado</p>
          <p className="text-sm" style={{ color: hintColor }}>{form.nombre} {form.apellidos}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="active:opacity-70">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: textColor }}>Nuevo cliente</h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-lg text-sm"
              style={{ background: "rgba(255,0,0,0.1)", color: "var(--tg-theme-destructive_text_color)" }}>
              {error}
            </div>
          )}

          {/* ── Nombre y apellidos ── */}
          <Section icon={User} label="Datos personales" accentColor={accentColor} bgColor={bgColor}>
            <Input label="Nombre *" value={form.nombre}
              onChange={(v) => update("nombre", v)} placeholder="Ej: María"
              inputBg={inputBg} textColor={textColor} hintColor={hintColor} autoFocus />
            <Input label="Apellidos" value={form.apellidos}
              onChange={(v) => update("apellidos", v)} placeholder="Ej: García López"
              inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
          </Section>

          {/* ── Contacto ── */}
          <Section icon={Phone} label="Contacto" accentColor={accentColor} bgColor={bgColor}>
            <Input label="Teléfono" value={form.telefono_principal}
              onChange={(v) => update("telefono_principal", v)} placeholder="+34 600 000 000" type="tel"
              inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
            <Input label="Email" value={form.email}
              onChange={(v) => update("email", v)} placeholder="cliente@email.com" type="email"
              inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
          </Section>

          {/* ── Dirección ── */}
          <Section icon={MapPin} label="Dirección" accentColor={accentColor} bgColor={bgColor}>
            <div className="flex gap-2">
              <div className="flex-[3]">
                <Input label="Calle" value={form.direccion_calle}
                  onChange={(v) => update("direccion_calle", v)} placeholder="Calle Mayor"
                  inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
              </div>
              <div className="flex-1">
                <Input label="Nº" value={form.direccion_numero}
                  onChange={(v) => update("direccion_numero", v)} placeholder="12"
                  inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input label="Municipio" value={form.direccion_municipio}
                  onChange={(v) => update("direccion_municipio", v)} placeholder="Barcelona"
                  inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
              </div>
              <div className="flex-1">
                <Input label="Provincia" value={form.direccion_provincia}
                  onChange={(v) => update("direccion_provincia", v)} placeholder="Barcelona"
                  inputBg={inputBg} textColor={textColor} hintColor={hintColor} />
              </div>
            </div>
          </Section>

          {/* Submit */}
          <button type="submit" disabled={mutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold mt-2 active:opacity-80 disabled:opacity-50"
            style={{ background: "var(--tg-theme-button_color)", color: "var(--tg-theme-button_text_color)" }}>
            {mutation.isPending ? "Creando..." : "Crear cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function Section({ icon: Icon, label, accentColor, bgColor, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; accentColor: string; bgColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: bgColor }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs font-semibold" style={{ color: accentColor }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", autoFocus, inputBg, textColor, hintColor }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
  inputBg: string; textColor: string; hintColor: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: hintColor, opacity: 0.7 }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus}
        className="w-full text-sm py-2 px-3 rounded-lg outline-none"
        style={{ background: inputBg, color: textColor }} />
    </div>
  );
}
