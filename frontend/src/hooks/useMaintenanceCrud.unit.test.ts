import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useMaintenanceCrud,
  type MaintenanceCrudConfig,
} from "./useMaintenanceCrud";

const mockUserToken = vi.fn().mockResolvedValue("token");
vi.mock("@/context/auth/useAuth", () => ({
  useAuth: () => ({ userToken: mockUserToken }),
}));

type Row = { id: number; name: string };
type Form = { name: string };

const existing: Row = { id: 1, name: "Existing" };
const saved: Row = { id: 2, name: "Saved" };

const search = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();

const makeConfig = (): MaintenanceCrudConfig<Row, Row, Form, Form, Form> => ({
  search,
  getDetail: async (entity) => entity,
  create,
  update,
  remove,
  emptyForm: { name: "" },
  applyToForm: (entity) => ({ name: entity.name }),
  buildCreatePayload: (form) => form,
  buildUpdatePayload: (form) => form,
  // Name is required; anything else is valid.
  validate: (form) => (form.name.trim() ? {} : { name: "Name is required." }),
});

const renderCrud = () => renderHook(() => useMaintenanceCrud(makeConfig()));

describe("useMaintenanceCrud onSave", () => {
  beforeEach(() => {
    [search, create, update, remove].forEach((m) => m.mockReset());
    search.mockResolvedValue([existing]);
    create.mockResolvedValue(saved);
    update.mockResolvedValue(saved);
  });

  // Regression guard for the "questions-create-bug": a successful create-save must
  // forward to the read-only VIEW of the saved record, not close the modal. A revert
  // to setModalMode(null) on create would fail here — the browser tests only cover
  // validation, so this is the fast unit-level guard for the transition.
  it("forwards to the view modal (not closed) after a successful create", async () => {
    const { result } = renderCrud();
    await waitFor(() => expect(search).toHaveBeenCalled());

    act(() => result.current.openCreate());
    expect(result.current.modalMode).toBe("create");

    act(() => result.current.updateForm({ name: "Saved" }));
    await act(async () => {
      await result.current.onSave();
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.modalMode).toBe("view");
    expect(result.current.selected).toEqual(saved);
    expect(result.current.formState).toEqual({ name: "Saved" });
  });

  it("forwards to the view modal after a successful update", async () => {
    const { result } = renderCrud();
    await waitFor(() => expect(search).toHaveBeenCalled());

    await act(async () => {
      await result.current.openView(existing);
    });
    act(() => result.current.openEdit());
    expect(result.current.modalMode).toBe("edit");

    act(() => result.current.updateForm({ name: "Saved" }));
    await act(async () => {
      await result.current.onSave();
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(result.current.modalMode).toBe("view");
    expect(result.current.selected).toEqual(saved);
  });

  it("blocks save and stays in the form when validation fails", async () => {
    const { result } = renderCrud();
    await waitFor(() => expect(search).toHaveBeenCalled());

    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.onSave();
    });

    expect(create).not.toHaveBeenCalled();
    expect(result.current.modalMode).toBe("create");
    expect(result.current.formErrors.name).toBe("Name is required.");
  });
});

// Config variant that exercises the dependent-delete guard and the message set.
const checkDependents = vi.fn();

const makeGuardedConfig = (): MaintenanceCrudConfig<Row, Row, Form, Form, Form> => ({
  ...makeConfig(),
  checkDependents,
  messages: {
    load: "Could not load records.",
    detail: "Could not load record details.",
    save: "Could not save record.",
    delete: "Could not delete record.",
  },
});

const renderGuarded = () =>
  renderHook(() => useMaintenanceCrud(makeGuardedConfig()));

// The delete orchestration (dependent guard, confirm dialog, remove, error
// handling) is untouched by the browser suite — this is its only coverage.
describe("useMaintenanceCrud delete flow", () => {
  beforeEach(() => {
    [search, create, update, remove, checkDependents].forEach((m) => m.mockReset());
    search.mockResolvedValue([existing]);
    remove.mockResolvedValue(undefined);
  });

  const openExisting = async (
    result: { current: ReturnType<typeof useMaintenanceCrud<Row, Row, Form, Form, Form>> },
  ) => {
    await waitFor(() => expect(search).toHaveBeenCalled());
    await act(async () => {
      await result.current.openView(existing);
    });
  };

  it("blocks delete without opening the confirm dialog when dependents exist", async () => {
    checkDependents.mockResolvedValue(true);
    const { result } = renderGuarded();
    await openExisting(result);

    await act(async () => {
      await result.current.requestDelete();
    });

    expect(result.current.deleteBlocked).toBe(true);
    expect(result.current.deleteModalOpen).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it("surfaces a message and skips the dialog when the dependent check throws", async () => {
    checkDependents.mockRejectedValue({
      response: { data: { message: "Dependent check failed." } },
    });
    const { result } = renderGuarded();
    await openExisting(result);

    await act(async () => {
      await result.current.requestDelete();
    });

    expect(result.current.deleteModalOpen).toBe(false);
    expect(result.current.deleteBlocked).toBe(false);
    expect(result.current.formMessage).toBe("Dependent check failed.");
    expect(remove).not.toHaveBeenCalled();
  });

  it("opens the dialog, deletes, and closes the modal when there are no dependents", async () => {
    checkDependents.mockResolvedValue(false);
    const { result } = renderGuarded();
    await openExisting(result);

    await act(async () => {
      await result.current.requestDelete();
    });
    expect(result.current.deleteModalOpen).toBe(true);

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(remove).toHaveBeenCalledWith(existing, "token");
    expect(result.current.modalMode).toBeNull();
    expect(result.current.deleteModalOpen).toBe(false);
  });

  it("keeps the record open and shows a message when delete fails", async () => {
    checkDependents.mockResolvedValue(false);
    remove.mockRejectedValue({ response: { data: { message: "Record is in use." } } });
    const { result } = renderGuarded();
    await openExisting(result);
    await act(async () => {
      await result.current.requestDelete();
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(result.current.formMessage).toBe("Record is in use.");
    expect(result.current.deleteModalOpen).toBe(false);
    expect(result.current.modalMode).toBe("view");
  });
});

// Save/detail failures surface a message and keep the modal in place — the
// browser suite only ever drives the happy paths.
describe("useMaintenanceCrud error paths", () => {
  beforeEach(() => {
    [search, create, update, remove].forEach((m) => m.mockReset());
    search.mockResolvedValue([existing]);
  });

  it("surfaces a save error and stays in the create form", async () => {
    create.mockRejectedValue({ response: { data: { message: "Name taken." } } });
    const { result } = renderCrud();
    await waitFor(() => expect(search).toHaveBeenCalled());

    act(() => result.current.openCreate());
    act(() => result.current.updateForm({ name: "Dup" }));
    await act(async () => {
      await result.current.onSave();
    });

    expect(result.current.formMessage).toBe("Name taken.");
    expect(result.current.modalMode).toBe("create");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("clears the selection and shows a message when detail load fails", async () => {
    const failingConfig: MaintenanceCrudConfig<Row, Row, Form, Form, Form> = {
      ...makeConfig(),
      getDetail: vi.fn().mockRejectedValue({ response: { data: { message: "Gone." } } }),
      messages: { detail: "Could not load record details." },
    };
    const { result } = renderHook(() => useMaintenanceCrud(failingConfig));
    await waitFor(() => expect(search).toHaveBeenCalled());

    await act(async () => {
      await result.current.openView(existing);
    });

    expect(result.current.selected).toBeNull();
    expect(result.current.formMessage).toBe("Gone.");
    expect(result.current.detailLoading).toBe(false);
  });
});

// The monotonic reloadSeq guard: a slow, superseded list response must not
// clobber a newer one. This race is invisible to the browser suite.
describe("useMaintenanceCrud race guards", () => {
  beforeEach(() => {
    [search, create, update, remove].forEach((m) => m.mockReset());
  });

  it("ignores a superseded reload whose response resolves after a newer one", async () => {
    search.mockResolvedValueOnce([existing]); // initial mount load
    const { result } = renderCrud();
    await waitFor(() => expect(result.current.items).toEqual([existing]));

    // Two overlapping reloads; the first (stale) is wired to resolve LAST.
    let resolveStale!: (rows: Row[]) => void;
    const stalePromise = new Promise<Row[]>((resolve) => {
      resolveStale = resolve;
    });
    search.mockReturnValueOnce(stalePromise); // reload #1 — pending
    search.mockResolvedValueOnce([saved]); // reload #2 — resolves immediately

    await act(async () => {
      void result.current.reload({ q: "stale" });
      await result.current.reload({ q: "fresh" });
    });
    expect(result.current.items).toEqual([saved]);

    // The stale response now arrives — it must be discarded, not applied.
    await act(async () => {
      resolveStale([existing]);
      await stalePromise;
    });
    expect(result.current.items).toEqual([saved]);
  });
});
