import {Component, ElementRef, Inject, OnInit, SecurityContext, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Board} from '../models/board.model';
import {DomSanitizer} from '@angular/platform-browser';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {ImageBase64Service} from '../image-base64.service';

@Component({
  selector: 'app-pdf-dialog',
  templateUrl: './pdf-dialog.component.html',
  styleUrls: ['./pdf-dialog.component.css']
})
export class PdfDialogComponent implements OnInit {

  board: Board;
  pdfMake;
  pdfOutput;
  pdfDefinition: object;
  compiledPdf;

  images = {};

  cellSpacing = 10;

  @ViewChild('pdfFrame') pdfFrame: ElementRef;

  constructor(@Inject(MAT_DIALOG_DATA) board: Board,
              private sanitiser: DomSanitizer,
              private imageBase64Service: ImageBase64Service) {

    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    this.pdfMake = pdfMake;
    this.board = board;
  }

  ngOnInit(): void {

    // Collect the images as Base64 and generatePDF() when all images are downloaded and ready.
    this.board.cells.map(cell => {
      // If an image is present, get it as Base64.
      if (cell.url) {
        this.imageBase64Service.getFromURL(cell.url).then(image => {
          this.images[cell.id] = image;
          if (this.imagesReady()) { this.generatePDF(); }
        });
      } else {
        this.images[cell.id] = null;
        if (this.imagesReady()) { this.generatePDF(); }
      }
    });

  }

  private imagesReady(): boolean {
    return Object.keys(this.images).length === this.board.cells.length;
  }

  generatePDF() {

    const widths = [];
    const heights = [];

    const spacerRow = [{ text: '', height: this.cellSpacing, colSpan: this.board.columns + (this.board.columns - 1) }];

    // Get the Cells as a matrix (rows * columns), and adjust each Cell to match pdfMake's format.
    // This outputs 2-item arrays. Item 0 is the Cell, item 2 is an empty spacer cell.
    // The spacer is omitted on the last cell in the row.
    // Afterwards, the array of 2-item arrays is flattened into a single array of Cells and Spacers.
    const cells = [];
    this.board.cellsAsMatrix().map((row, rowNumber) => {
      row = row.map((cell, cellNumber) => {

        const imageDefinition = (this.images[cell.id] === null) ? {} : {
          image: this.images[cell.id],
          fit: [90, 90],
          alignment: 'center'
        };

        const textDefinition = {
          text: cell.caption || '[no caption]'
        };

        const cellDefinition = {
          stack: [],
          fillColor: cell.backgroundColour,
          border: [true, true, true, true],
          style: 'imageCell'
        };

        if (this.board.defaultCellFormat.labelPosition === 'top') {
          cellDefinition.stack.push(textDefinition);
        }

        cellDefinition.stack.push(imageDefinition);

        if (this.board.defaultCellFormat.labelPosition === 'bottom') {
          cellDefinition.stack.push(textDefinition);
        }

        // Generate widths on the first row only.
        if (rowNumber === 0) {
          // Push an auto-width to Widths for the Cell.
          widths.push('*');

          // If this cell has a spacer cell after it, add a width for the spacer too.
          if ((cellNumber + 1) < this.board.columns) {
            widths.push(this.cellSpacing);
          }
        }

        // Return an array of the cell and spacer, or just the cell if this is the last in the row.
        return ((cellNumber + 1) === this.board.columns) ? cellDefinition : [cellDefinition, ''];
      }).flat();

      // An auto-height for the image row.
      heights.push('*');
      cells.push(row);

      if ((rowNumber + 1) < this.board.rows) {
        heights.push(this.cellSpacing);
        cells.push(spacerRow);
      }

      // Return an array of the row and spacer row, or just the row if this is the last row.
      return ((rowNumber + 1) === this.board.rows) ? row : [row, spacerRow]; // TODO: Set colspan on the spacer.
    });

    console.log(cells);

    this.pdfDefinition = {
      pageOrientation: (this.board.rows > this.board.columns) ? 'portrait' : 'landscape',
      styles: {
        imageCell: {
          alignment: 'center'
        }
      },
      content: [
        {
          table: {
            // headers are automatically repeated if the table spans over multiple pages
            // you can declare how many rows should be treated as headers
            headerRows: 0,
            widths, // All cols should have equal width
            heights,
            body: cells
          },
          layout: {
            defaultBorder: false,
          }
        }
      ]
    };

    this.compiledPdf = this.pdfMake.createPdf(this.pdfDefinition);

    this.compiledPdf.getDataUrl((dataUrl) => {
      this.pdfFrame.nativeElement.src = dataUrl;
    });
  }

  downloadPdf() {
    this.compiledPdf.download();
  }
}
