import { fileTypeFromFile } from "file-type";

const files = [
  "fixtures/sample.docx",
  "fixtures/sample.xlsx",
  "fixtures/sample.pptx",
];

for (const file of files) {
  try {
    const result = await fileTypeFromFile(file);

    console.log(file, "=>", result?.mime ?? "Unknown");
  } catch (error) {
    console.error(file, "=>", error.message);
  }
}
