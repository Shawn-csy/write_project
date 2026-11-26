import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { DemoArtworkImage } from "./DemoArtworkImage";

it("tries each backup cover and removes the failed image when all fail", () => {
  const sources = ["https://example.com/demo.jpg", "https://img.youtube.com/vi/sample/hqdefault.jpg", "https://example.com/script.jpg"];
  const alt = "演出封面";
  render(<DemoArtworkImage sources={sources} alt={alt} />);
  for (const src of sources) {
    const image = screen.getByAltText(alt);
    expect(image.getAttribute("src")).toBe(src);
    fireEvent.error(image);
  }
  expect(screen.queryByAltText(alt)).toBeNull();
});
