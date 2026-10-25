export type FieldErrors = Record<string, string>;

export function validateForm(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  const controls = Array.from(form.elements).filter(
    (element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement,
  );

  for (const control of controls) {
    if (!control.willValidate) continue;
    const invalidHttpUrl =
      control instanceof HTMLInputElement &&
      control.type === "url" &&
      !validateHttpUrl(control.value);
    if (control.validity.valid && !invalidHttpUrl) continue;
    const name = control.name || control.id;
    if (!name) continue;
    const validity = control.validity;
    let message = "Verifique este campo.";
    if (validity.valueMissing)
      message =
        control instanceof HTMLSelectElement ? "Selecione uma opção." : "Preencha este campo.";
    else if (invalidHttpUrl || (control instanceof HTMLInputElement && control.type === "url")) {
      message = "Introduza um link válido, começando por https:// ou http://.";
    } else if (control instanceof HTMLInputElement && control.type === "email") {
      message = "Introduza um endereço de email válido.";
    } else if (validity.patternMismatch && name === "slug")
      message = "Use letras minúsculas, números e hífen, sem espaços.";
    else if (validity.patternMismatch && name === "label")
      message = "Use o formato AAAA/AAAA, por exemplo 2026/2027.";
    else if (validity.patternMismatch) message = "O formato deste campo não é válido.";
    else if (validity.typeMismatch) message = "Introduza um valor num formato válido.";
    else if (validity.rangeUnderflow)
      message = `O valor mínimo permitido é ${control.getAttribute("min")}.`;
    else if (validity.rangeOverflow)
      message = `O valor máximo permitido é ${control.getAttribute("max")}.`;
    else if (validity.stepMismatch) message = "Introduza um número inteiro válido.";
    else if (validity.tooShort)
      message = `Introduza pelo menos ${control.getAttribute("minLength")} caracteres.`;
    else if (validity.tooLong)
      message = `Use no máximo ${control.getAttribute("maxLength")} caracteres.`;
    else if (validity.badInput) message = "Introduza um valor válido.";
    errors[name] = message;
  }

  const firstError = Object.keys(errors)[0];
  if (firstError) controls.find((control) => control.name === firstError)?.focus();
  return errors;
}

export function validateHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
