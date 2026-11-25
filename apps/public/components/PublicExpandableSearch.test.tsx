import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicExpandableSearch } from "./PublicExpandableSearch";

describe("PublicExpandableSearch", () => {
  it("keeps a draft local until the existing search button submits it", () => {
    const onChange = vi.fn();
    render(<PublicExpandableSearch value="" onChange={onChange} placeholder="搜尋台本" applyOnSubmit />);
    fireEvent.click(screen.getByRole("button", { name: "開啟搜尋" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "台本" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "套用搜尋" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("台本");
  });

  it("keeps an unsubmitted draft after an outside click without intercepting that click", () => {
    const onChange = vi.fn();
    const onOutsideClick = vi.fn();
    render(<>
      <PublicExpandableSearch value="原本的搜尋" onChange={onChange} placeholder="搜尋台本" applyOnSubmit />
      <button type="button" onClick={onOutsideClick}>其他操作</button>
    </>);
    fireEvent.click(screen.getByRole("button", { name: "開啟搜尋" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "草稿" } });
    fireEvent.click(screen.getByRole("button", { name: "其他操作" }));

    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(onOutsideClick).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();

    expect(fireEvent.click(screen.getByRole("button", { name: "開啟搜尋" }))).toBe(false);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("草稿");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("focuses the input on open and returns focus on Escape without clearing the homepage query", () => {
    const onChange = vi.fn();
    render(<PublicExpandableSearch value="台本" onChange={onChange} placeholder="搜尋台本" applyOnSubmit />);
    const trigger = screen.getByRole("button", { name: "開啟搜尋" });
    expect(screen.queryByRole("searchbox")).toBeNull();

    fireEvent.click(trigger);
    const input = screen.getByRole("searchbox", { name: "搜尋台本" });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "配音" } });

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("配音");
  });

  it("clears the independent list search on close when requested", () => {
    const onChange = vi.fn();
    render(<PublicExpandableSearch value="台本" onChange={onChange} placeholder="快速搜尋" clearOnClose />);
    fireEvent.click(screen.getByRole("button", { name: "開啟搜尋" }));
    fireEvent.click(screen.getByRole("button", { name: "收合搜尋" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
