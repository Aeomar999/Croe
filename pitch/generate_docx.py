#!/usr/bin/env python3
"""
Generate Croe Stakeholder Word Documents (.docx)
Creates executive-styled Word documents adhering to the Croe Design System ("Calm over confrontation",
trademark 'croe.' with green dot, clean typography, styled tables, and callouts).
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

ASSETS_DIR = r"c:\Users\Jerry\Desktop\PROJECT 2026\Croe\pitch\assets"
PITCH_DIR = r"c:\Users\Jerry\Desktop\PROJECT 2026\Croe\pitch"

# Color constants
COLOR_NAVY_HEX = "0F172A"       # Slate 900
COLOR_BLUE_HEX = "2563EB"       # Trust Blue
COLOR_GREEN_HEX = "1FC16B"      # Croe Green
COLOR_LIGHT_BG_HEX = "F8FAFC"   # Slate 50
COLOR_BORDER_HEX = "E2E8F0"     # Border
COLOR_BLUE_BG_HEX = "EFF6FF"    # Light Blue Tint
COLOR_AMBER_BG_HEX = "FEF3C7"   # Warm Amber Tint
COLOR_AMBER_TEXT_HEX = "B45309" # Dark Amber

RGB_HEAD = RGBColor(15, 23, 42)
RGB_BODY = RGBColor(51, 65, 85)
RGB_MUTED = RGBColor(100, 116, 139)
RGB_BLUE = RGBColor(37, 99, 235)
RGB_GREEN = RGBColor(31, 193, 107)

FONT_PRIMARY = "Segoe UI"

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'))

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def style_table(table, header_bg=COLOR_NAVY_HEX, header_text_color=RGBColor(255, 255, 255), zebra=True):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Set thin border
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

    # Style rows
    for row_idx, row in enumerate(table.rows):
        is_header = (row_idx == 0)
        for cell in row.cells:
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, top=130, bottom=130, left=160, right=160)
            if is_header:
                set_cell_shading(cell, header_bg)
                for paragraph in cell.paragraphs:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    for run in paragraph.runs:
                        run.font.name = FONT_PRIMARY
                        run.font.bold = True
                        run.font.size = Pt(9.5)
                        run.font.color.rgb = header_text_color
            else:
                if zebra and row_idx % 2 == 1:
                    set_cell_shading(cell, COLOR_LIGHT_BG_HEX)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.name = FONT_PRIMARY
                        run.font.size = Pt(9.5)
                        run.font.color.rgb = RGB_BODY

def add_header_banner(doc, title, subtitle, doc_ref):
    # Top table with logo on left and doc ref on right
    hdr_table = doc.add_table(rows=1, cols=2)
    hdr_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_table.autofit = False
    hdr_table.columns[0].width = Inches(4.5)
    hdr_table.columns[1].width = Inches(2.5)

    c0 = hdr_table.cell(0, 0)
    c1 = hdr_table.cell(0, 1)

    # Logo
    logo_path = os.path.join(ASSETS_DIR, "croe_wordmark_dark.png")
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(0)
    if os.path.exists(logo_path):
        p0.add_run().add_picture(logo_path, width=Inches(1.2))

    # Ref / Status
    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.paragraph_format.space_before = Pt(4)
    p1.paragraph_format.space_after = Pt(0)
    r1 = p1.add_run(doc_ref)
    r1.font.name = FONT_PRIMARY
    r1.font.size = Pt(9)
    r1.font.bold = True
    r1.font.color.rgb = RGB_BLUE

    # Title & Subtitle
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(4)
    r_t = p_t.add_run(title)
    r_t.font.name = FONT_PRIMARY
    r_t.font.size = Pt(22)
    r_t.font.bold = True
    r_t.font.color.rgb = RGB_HEAD

    p_s = doc.add_paragraph()
    p_s.paragraph_format.space_before = Pt(0)
    p_s.paragraph_format.space_after = Pt(16)
    r_s = p_s.add_run(subtitle)
    r_s.font.name = FONT_PRIMARY
    r_s.font.size = Pt(12)
    r_s.font.color.rgb = RGB_MUTED

    # Subtle divider
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(0)
    p_div.paragraph_format.space_after = Pt(14)
    r_div = p_div.add_run("―" * 58)
    r_div.font.size = Pt(8)
    r_div.font.color.rgb = RGBColor(226, 232, 240)

def add_heading_styled(doc, text, level=1):
    p = doc.add_paragraph()
    if level == 1:
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(text)
        r.font.name = FONT_PRIMARY
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = RGB_BLUE
    elif level == 2:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = FONT_PRIMARY
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = RGB_HEAD
    return p

def add_body_p(doc, text, bold_prefix="", space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = FONT_PRIMARY
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGB_HEAD
    r = p.add_run(text)
    r.font.name = FONT_PRIMARY
    r.font.size = Pt(10)
    r.font.color.rgb = RGB_BODY
    return p

def add_callout(doc, text, title="KEY STRATEGIC INSIGHT", bg_hex=COLOR_BLUE_BG_HEX, border_hex=COLOR_BLUE_HEX, title_rgb=RGB_BLUE):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(7.0)
    cell = table.cell(0, 0)
    set_cell_shading(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    # Left border
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>
            <w:top w:val="none"/>
            <w:right w:val="none"/>
            <w:bottom w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    r_t = p.add_run(f"⚡  {title}")
    r_t.font.name = FONT_PRIMARY
    r_t.font.size = Pt(9.5)
    r_t.font.bold = True
    r_t.font.color.rgb = title_rgb

    p2 = cell.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.line_spacing = 1.15
    r2 = p2.add_run(text)
    r2.font.name = FONT_PRIMARY
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGB_HEAD

    # Space after table
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

def add_footer(doc, doc_title):
    section = doc.sections[0]
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run(f"{doc_title}  |  croe.  |  Confidential")
    r.font.name = FONT_PRIMARY
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGB_MUTED

# ==============================================================================
# DOC 1: Executive One-Pager (.docx)
# ==============================================================================
def generate_one_pager_docx():
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.75)
    sec.bottom_margin = Inches(0.75)
    sec.left_margin = Inches(0.75)
    sec.right_margin = Inches(0.75)

    add_header_banner(
        doc,
        title="croe. - Executive Summary",
        subtitle="Escrow for Social Commerce, on Mobile Money. Ghana-First.",
        doc_ref="STAKEHOLDER BRIEF · SEPTEMBER 2026"
    )

    add_heading_styled(doc, "1. The Problem: The Trust Standoff in Social Commerce", level=1)
    add_body_p(doc, "Social commerce in Ghana runs on trust that does not exist. A buyer finds a smartphone, laptop, or designer sneakers on Instagram and is asked to send Mobile Money (MoMo) to a stranger. The vendor is asked to dispatch goods via dispatch rider to someone who may refuse to pay. Both positions are completely rational, and the sale dies between them.", bold_prefix="Structural Failure: ")
    add_body_p(doc, "Vendors routinely lose 25%–30% of qualified buyer inquiries to payment anxiety. Buyers who do pay upfront absorb recurring fraud with zero recourse - no enforceable receipt, no neutral arbiter, and no path to an automated refund.")

    add_heading_styled(doc, "2. The Solution: Frictionless Escrow on MoMo Rails", level=1)
    
    # 4-step table
    t_sol = doc.add_table(rows=5, cols=3)
    headers = ["Step", "Action", "Customer Experience"]
    for i, h in enumerate(headers):
        t_sol.cell(0, i).paragraphs[0].text = h
    
    data_sol = [
        ("1. Link", "Vendor creates escrow link", "Shared directly in WhatsApp or Instagram DM where the sale is already happening."),
        ("2. Pay", "Buyer authorizes MoMo payment", "Standard USSD prompt on their handset. Funds lock in escrow - vendor sees it, but cannot touch it."),
        ("3. Ship", "Vendor dispatches order", "Goods dispatched against guaranteed locked money rather than an empty promise."),
        ("4. Release", "Buyer confirms delivery", "Vendor paid automatically, less 2.0% commission. If an issue occurs, a structured dispute opens.")
    ]
    for row_idx, (c0, c1, c2) in enumerate(data_sol, start=1):
        t_sol.cell(row_idx, 0).paragraphs[0].text = c0
        t_sol.cell(row_idx, 1).paragraphs[0].text = c1
        t_sol.cell(row_idx, 2).paragraphs[0].text = c2
    style_table(t_sol)

    add_heading_styled(doc, "3. Why Escrow Is Hard - And Why Croe Is Ahead", level=1)
    add_body_p(doc, "Holding third-party funds falls under the Bank of Ghana (BoG) and the Payment Systems and Services Act, 2019 (Act 987). Unlicensed platforms get shut down; full licences require millions in capital. Croe solves this through a Phased Custody Chain: Croe never holds client funds on its own balance sheet. In pilot (P1), funds settle via aggregator settlement; at scale (P2), via a licensed partner bank trust account. The CustodyProvider software abstraction means moving from pilot to institutional custody is a configuration switch, not a code rewrite.", bold_prefix="1. Regulatory Compliance by Design: ")
    add_body_p(doc, "Manual arbitration destroys unit economics on small orders. Croe runs a 3-tier dispute engine: cryptographic SHA-256 media hashing (catches recycled scam imagery across vendors), deterministic SQL heuristics (velocity and Sybil tripwires), and a self-hosted open-weights LLM arbitrator that handles straightforward claims and escalates only ambiguous cases to human review. Customer dispute data never leaves self-hosted infrastructure.", bold_prefix="2. Automated Impartial Dispute Triage: ")

    add_heading_styled(doc, "4. Current Status: Built, Tested & Proven", level=1)
    add_body_p(doc, "Croe is not a mockup. The complete backend and React Native mobile application are finished, running on aggregator sandboxes with 354 automated tests passing (275 backend + 79 frontend), including concurrent-webhook race tests and NUMERIC(15,2) decimal precision verification.")

    add_heading_styled(doc, "5. Business Model & Unit Economics", level=1)
    add_body_p(doc, "Croe charges a standard 2.0% commission on successfully released transactions (0% on refunds). We lead with high-ticket electronics, smartphones, and streetwear where average tickets are ~GHS 1,200:")

    t_econ = doc.add_table(rows=3, cols=5)
    econ_hdrs = ["Commercial Segment", "AOV", "Gross (2%)", "Net Margin (`C`)", "Break-Even Vol."]
    for i, h in enumerate(econ_hdrs):
        t_econ.cell(0, i).paragraphs[0].text = h
    data_econ = [
        ("Lead Vertical: Electronics & Streetwear", "GHS 1,200.00", "GHS 24.00", "≈ GHS 22.50 – 23.00", "~22 txns / month"),
        ("Baseline General Social Commerce", "GHS 450.00", "GHS 9.00", "≈ GHS 7.50 – 8.00", "~63 txns / month")
    ]
    for row_idx, row_data in enumerate(data_econ, start=1):
        for col_idx, val in enumerate(row_data):
            t_econ.cell(row_idx, col_idx).paragraphs[0].text = val
    style_table(t_econ, header_bg=COLOR_NAVY_HEX)

    add_callout(
        doc,
        "By leading with high-ticket electronics and streetwear (AOV GHS 1,200), Croe triples net margin per transaction and reduces monthly break-even from 63 to just 22 transactions against lean pilot overhead (< GHS 500/mo).",
        title="TICKET-SIZE LEVERAGE"
    )

    add_heading_styled(doc, "6. The Ask: Dual-Track Pilot Funding", level=1)
    t_ask = doc.add_table(rows=3, cols=4)
    ask_hdrs = ["Funding Track", "Capital Needed", "Allocation Scope", "Target Milestone"]
    for i, h in enumerate(ask_hdrs):
        t_ask.cell(0, i).paragraphs[0].text = h
    data_ask = [
        ("Track A: Lean Bootstrap", "GHS 30,000 (~$2,500)", "ORC company registration, TIN, DPC filing, T+2 working capital float, 3-mo lean infra.", "First 100+ live transactions on compliant rails, measured conversion & dispute rate."),
        ("Track B: Institutional / Accelerated", "GHS 150,000 (~$12,500)", "Track A + formal fintech legal counsel (BoG PFTSP opinion & trust ToS), external pen test, multi-AZ cloud.", "Complete institutional de-risking for P2 partner bank onboarding & accelerator entry.")
    ]
    for row_idx, row_data in enumerate(data_ask, start=1):
        for col_idx, val in enumerate(row_data):
            t_ask.cell(row_idx, col_idx).paragraphs[0].text = val
    style_table(t_ask, header_bg=COLOR_BLUE_HEX)

    add_footer(doc, "Executive Summary")
    out_file = os.path.join(PITCH_DIR, "Croe_Executive_One_Pager.docx")
    doc.save(out_file)
    print(f"Generated: {out_file}")

# ==============================================================================
# DOC 2: Financial Model & Unit Economics (.docx)
# ==============================================================================
def generate_financial_model_docx():
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.8)
    sec.bottom_margin = Inches(0.8)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)

    add_header_banner(
        doc,
        title="croe. - Financial Model & Unit Economics",
        subtitle="Mathematical Architecture, Sensitivity Analysis & Dual-Track Budget Reference",
        doc_ref="FINANCIAL SPECIFICATION · RULE FIN-01 COMPLIANT"
    )

    add_heading_styled(doc, "1. Executive Summary & Precision Mandates", level=1)
    add_body_p(doc, "Every financial computation in Croe complies strictly with rule FIN-01: absolute NUMERIC(15,2) decimal precision with zero floating-point arithmetic. Currencies are explicitly tagged (GHS, USD per rule FIN-02). Revenue is generated through a standard 2.0% commission deducted from vendor payout upon successful delivery release. Zero commission is charged on refunded orders.", bold_prefix="Financial Discipline: ")

    add_heading_styled(doc, "2. Unit Economics Across Commercial Tiers", level=1)
    t_unit = doc.add_table(rows=9, cols=4)
    hdrs = ["Financial Line", "Tier 1: General Retail", "Tier 2: Thrift / Beauty", "Tier 3: Electronics / Sneakers (Lead)"]
    for i, h in enumerate(hdrs):
        t_unit.cell(0, i).paragraphs[0].text = h
    
    rows_unit = [
        ("Buyer Escrow Deposit", "GHS 450.00", "GHS 700.00", "GHS 1,200.00"),
        ("Aggregator Collection Fee (1.5%)*", "(GHS 6.75)", "(GHS 10.50)", "(GHS 18.00)"),
        ("Croe Gross Commission (2.0%)", "+ GHS 9.00", "+ GHS 14.00", "+ GHS 24.00"),
        ("MoMo B2C Payout Fee", "- GHS 1.00", "- GHS 1.00", "- GHS 1.00"),
        ("Allocated SMS & Tech Overhead", "- GHS 0.50", "- GHS 0.50", "- GHS 0.50"),
        ("Croe Net Profit per Order (`C`)", "≈ GHS 7.50", "≈ GHS 12.50", "≈ GHS 22.50"),
        ("Vendor Net Payout", "GHS 441.00", "GHS 686.00", "GHS 1,176.00"),
        ("Effective Net Take Rate", "1.67%", "1.79%", "1.88%")
    ]
    for r_idx, r_data in enumerate(rows_unit, start=1):
        for c_idx, val in enumerate(r_data):
            t_unit.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_unit, header_bg=COLOR_NAVY_HEX)

    add_heading_styled(doc, "3. Fixed Operating Overhead Models", level=1)
    add_body_p(doc, "Fixed overhead (F) is structured in two distinct tiers to preserve lean cash discipline during the validation pilot:")

    t_fix = doc.add_table(rows=7, cols=3)
    fix_hdrs = ["Infrastructure Item", "Lean Pilot Mode (<GHS 500/mo)", "Institutional Scale (~GHS 3,000/mo)"]
    for i, h in enumerate(fix_hdrs):
        t_fix.cell(0, i).paragraphs[0].text = h
    rows_fix = [
        ("API Compute Hosting", "GHS 150.00 (Single Container)", "GHS 600.00 (Multi-AZ Cluster)"),
        ("Managed PostgreSQL Database", "GHS 150.00 (Standard)", "GHS 500.00 (High-Availability + PITR)"),
        ("Managed Redis Cache / Dedup", "GHS 75.00", "GHS 250.00 (Clustered)"),
        ("AI Arbitrator Hosting", "GHS 0.00 (Host CPU / Local Ollama)", "GHS 1,200.00 (Dedicated GPU Box)"),
        ("Transactional SMS / OTPs", "GHS 90.00 (Pay-as-you-go)", "GHS 300.00 (Enterprise Deliverability)"),
        ("Total Monthly Fixed Costs (`F`)", "≈ GHS 465.00 – 500.00", "≈ GHS 2,850.00 – 3,000.00")
    ]
    for r_idx, r_data in enumerate(rows_fix, start=1):
        for c_idx, val in enumerate(r_data):
            t_fix.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_fix, header_bg=COLOR_BLUE_HEX)

    add_heading_styled(doc, "4. Break-Even Sensitivity & Payback Analysis", level=1)
    add_body_p(doc, "Monthly break-even transactions (N = F / C) across ticket sizes and overhead structures:")

    t_sens = doc.add_table(rows=4, cols=4)
    sens_hdrs = ["Fixed Overhead (`F`)", "General (AOV GHS 450)", "Thrift/Beauty (AOV GHS 700)", "Lead: Electronics (AOV GHS 1,200)"]
    for i, h in enumerate(sens_hdrs):
        t_sens.cell(0, i).paragraphs[0].text = h
    rows_sens = [
        ("GHS 500 / mo (Lean Pilot)", "67 txns / month", "40 txns / month", "22 txns / month"),
        ("GHS 1,500 / mo (Interim)", "200 txns / month", "120 txns / month", "67 txns / month"),
        ("GHS 3,000 / mo (GPU Scale)", "400 txns / month", "240 txns / month", "133 txns / month")
    ]
    for r_idx, r_data in enumerate(rows_sens, start=1):
        for c_idx, val in enumerate(r_data):
            t_sens.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_sens)

    add_heading_styled(doc, "5. Working Capital & Settlement Lag Float", level=1)
    add_body_p(doc, "When payment aggregators settle at T+2, but Croe releases funds to merchants at T+0 upon delivery confirmation, Croe maintains a working capital float to bridge settlement lag:")

    t_float = doc.add_table(rows=5, cols=4)
    fl_hdrs = ["Monthly Completed Txns", "Monthly GMV (AOV GHS 1,200)", "Required T+2 Float", "Funded Loss Reserve (2%)"]
    for i, h in enumerate(fl_hdrs):
        t_float.cell(0, i).paragraphs[0].text = h
    rows_fl = [
        ("25 txns / mo (Early Pilot)", "GHS 30,000.00", "GHS 2,000.00", "GHS 600.00"),
        ("100 txns / mo (Target Pilot)", "GHS 120,000.00", "GHS 8,000.00", "GHS 2,400.00"),
        ("300 txns / mo (Commercial)", "GHS 360,000.00", "GHS 24,000.00", "GHS 7,200.00"),
        ("1,000 txns / mo (Scale)", "GHS 1,200,000.00", "GHS 80,000.00", "GHS 24,000.00")
    ]
    for r_idx, r_data in enumerate(rows_fl, start=1):
        for c_idx, val in enumerate(r_data):
            t_float.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_float)

    add_heading_styled(doc, "6. Itemized Dual-Track Pilot Budgets", level=1)
    
    add_body_p(doc, "Track A: Lean Bootstrap Pilot (GHS 30,000 / ~$2,500 USD)", bold_prefix="Track A: ")
    t_ta = doc.add_table(rows=5, cols=3)
    for i, h in enumerate(["Expense Line Item", "Budget (GHS)", "USD Equiv."]):
        t_ta.cell(0, i).paragraphs[0].text = h
    data_ta = [
        ("Entity Formation (ORC) + TIN + DPC Registration", "GHS 2,400.00", "$200.00"),
        ("Developer Accounts (Apple $99 + Google $25) + Domain", "GHS 1,700.00", "$142.00"),
        ("Initial T+2 Float & Loss Reserve", "GHS 5,000.00", "$417.00"),
        ("3 Months Lean Infrastructure & Pilot Operations", "GHS 20,900.00", "$1,741.00")
    ]
    for r_idx, r_data in enumerate(data_ta, start=1):
        for c_idx, val in enumerate(r_data):
            t_ta.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_ta)

    add_body_p(doc, "Track B: Institutional / Accelerated Pilot (GHS 150,000 / ~$12,500 USD)", bold_prefix="Track B: ")
    t_tb = doc.add_table(rows=6, cols=3)
    for i, h in enumerate(["Expense Line Item", "Budget (GHS)", "USD Equiv."]):
        t_tb.cell(0, i).paragraphs[0].text = h
    data_tb = [
        ("Specialist Fintech Legal Counsel (BoG PFTSP opinion & trust ToS)", "GHS 45,000.00", "$3,750.00"),
        ("Independent External Penetration Test & Security Audit", "GHS 35,000.00", "$2,917.00"),
        ("Entity Incorporation via Agent + DPC Filing + Trademark", "GHS 8,000.00", "$667.00"),
        ("T+2 Working Capital Float & Funded 2% Loss Reserve", "GHS 25,000.00", "$2,083.00"),
        ("6 Months Multi-AZ Cloud Infra, SMS & Operations Runway", "GHS 37,000.00", "$3,083.00")
    ]
    for r_idx, r_data in enumerate(data_tb, start=1):
        for c_idx, val in enumerate(r_data):
            t_tb.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_tb)

    add_footer(doc, "Financial Model & Unit Economics")
    out_file = os.path.join(PITCH_DIR, "Croe_Financial_Model.docx")
    doc.save(out_file)
    print(f"Generated: {out_file}")

# ==============================================================================
# DOC 3: Banking Partner & Custody Brief (.docx)
# ==============================================================================
def generate_banking_brief_docx():
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.8)
    sec.bottom_margin = Inches(0.8)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)

    add_header_banner(
        doc,
        title="croe. - Banking Partner & Custody Brief",
        subtitle="Institutional Due-Diligence, Trust Architecture & Regulatory Compliance",
        doc_ref="INSTITUTIONAL PARTNERSHIP BRIEF · BOG ACT 987 COMPLIANT"
    )

    add_heading_styled(doc, "1. Executive Summary & Partnership Proposition", level=1)
    add_body_p(doc, "Croe is a mobile-first trust and escrow transaction service for emerging-market social commerce, launching Ghana-first on Mobile Money rails. Croe acts as a technology orchestration platform that channels high-velocity social commerce payments into a licensed partner bank trust account.", bold_prefix="The Opportunity: ")

    t_prop = doc.add_table(rows=3, cols=2)
    for i, h in enumerate(["Value Delivered to Partner Bank", "Operational Role of Partner Bank"]):
        t_prop.cell(0, i).paragraphs[0].text = h
    rows_prop = [
        ("Low-Cost Float Growth: Sticky, non-interest-bearing escrow deposits residing in a pooled trust account (CASA float).", "Custodial Trust Account: Provide a dedicated pooled escrow trust account under Bank of Ghana guidelines."),
        ("Transactional Revenue: Transaction fee revenue on high-velocity inbound collections and outbound B2C wallet disbursements.", "Automated Reconciliation: Automated electronic statement feed (MT940 / API) for daily 3-way balance matching.")
    ]
    for r_idx, r_data in enumerate(rows_prop, start=1):
        for c_idx, val in enumerate(r_data):
            t_prop.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_prop, header_bg=COLOR_NAVY_HEX)

    add_heading_styled(doc, "2. Regulatory Architecture: The Non-Custodial Tech Provider", level=1)
    add_body_p(doc, "Croe is not a bank, does not issue electronic money, and never holds customer funds on its corporate balance sheet. Holding third-party funds in Ghana is governed by the Bank of Ghana under the Payment Systems and Services Act, 2019 (Act 987). Croe achieves compliance via a Phased Custody Architecture where float is held strictly by licensed institutions:", bold_prefix="Act 987 Compliance: ")

    t_reg = doc.add_table(rows=4, cols=4)
    for i, h in enumerate(["Phase", "Legal Role of Croe", "Float Holder", "Compliance Standing"]):
        t_reg.cell(0, i).paragraphs[0].text = h
    rows_reg = [
        ("P0: Build", "Software Developer", "Nobody (Sandbox)", "Development only; 354 automated tests."),
        ("P1: Pilot", "Technology Merchant", "Aggregator Settlement Account", "Interim supervised pilot; strict transaction caps (<100 txn)."),
        ("P2: Partner-Held", "Payment Tech Provider (PFTSP)", "Licensed Bank Pooled Trust Account", "Fully compliant institutional launch; bank-held trust account.")
    ]
    for r_idx, r_data in enumerate(rows_reg, start=1):
        for c_idx, val in enumerate(r_data):
            t_reg.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_reg, header_bg=COLOR_BLUE_HEX)

    add_heading_styled(doc, "3. Double-Spend Defense & Ledger Immutability", level=1)
    add_body_p(doc, "Croe incorporates three structural layers of defense preventing financial double-spend or unauthorized disbursement:", bold_prefix="Triple-Lock Concurrency: ")
    add_body_p(doc, "1. Redis Distributed Fast Dedup: SETNX with 24-hour TTL guarantees instantaneous short-circuiting of duplicate webhooks.\n2. Row Locking (SELECT ... FOR UPDATE): All state mutations serialize concurrent requests at the PostgreSQL database row level.\n3. Partial Unique Indexes: Error 23505 traps guarantee that concurrent deposits or duplicate payouts fail structurally.")
    add_body_p(doc, "Balance history resides in an append-only transaction_ledger where UPDATE and DELETE privileges are permanently revoked at the database role level.", bold_prefix="Append-Only Sub-Ledger: ")

    add_heading_styled(doc, "4. KYC & AML Compliance Controls", level=1)
    t_kyc = doc.add_table(rows=4, cols=4)
    for i, h in enumerate(["Tier", "Verification Requirements", "Per-Transaction Cap", "Daily Limit"]):
        t_kyc.cell(0, i).paragraphs[0].text = h
    rows_kyc = [
        ("Tier 0", "Phone verified via MoMo OTP", "GHS 500.00", "GHS 1,000.00"),
        ("Tier 1", "Full Name + Ghana Card / Passport", "GHS 5,000.00", "GHS 20,000.00"),
        ("Tier 2", "Enhanced Due Diligence (EDD) + Address", "GHS 50,000.00", "GHS 100,000.00")
    ]
    for r_idx, r_data in enumerate(rows_kyc, start=1):
        for c_idx, val in enumerate(r_data):
            t_kyc.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_kyc)

    add_heading_styled(doc, "5. Automated Daily Three-Way Reconciliation", level=1)
    add_body_p(doc, "Every 24 hours, Croe executes an automated three-way reconciliation matching: (1) Bank Partner Escrow Float Account statement balance, (2) Sum of active unreleased funds in the immutable transaction ledger, and (3) Physical payment rail transaction logs. If any non-zero variance occurs, the system logs a Priority 1 (P1) incident, halts automated disbursement workers, and alerts operations.", bold_prefix="Circuit Breaker: ")

    add_heading_styled(doc, "6. Projected Commercial Scale for Banking Partner", level=1)
    t_proj = doc.add_table(rows=4, cols=4)
    for i, h in enumerate(["Milestone", "Monthly Completed Txns", "Monthly Processing Volume", "Average Daily Float in Bank"]):
        t_proj.cell(0, i).paragraphs[0].text = h
    rows_proj = [
        ("Supervised Pilot (Day 1–60)", "100 txns / mo", "GHS 120,000.00", "GHS 8,000 – 12,000"),
        ("Commercial Scale (Year 1)", "1,000 txns / mo", "GHS 1,200,000.00", "GHS 80,000 – 120,000"),
        ("Expansion (Year 2)", "5,000 txns / mo", "GHS 6,000,000.00", "GHS 400,000 – 600,000")
    ]
    for r_idx, r_data in enumerate(rows_proj, start=1):
        for c_idx, val in enumerate(r_data):
            t_proj.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_proj)

    add_footer(doc, "Banking Partner & Custody Brief")
    out_file = os.path.join(PITCH_DIR, "Croe_Banking_Partner_Brief.docx")
    doc.save(out_file)
    print(f"Generated: {out_file}")

# ==============================================================================
# DOC 4: Vendor Pilot Guide & Agreement (.docx)
# ==============================================================================
def generate_vendor_agreement_docx():
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.8)
    sec.bottom_margin = Inches(0.8)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)

    add_header_banner(
        doc,
        title="croe. - Vendor Pilot Guide & Agreement",
        subtitle="How Croe Closes Your Sales & Pilot Onboarding Agreement",
        doc_ref="VENDOR PILOT COHORT · ACCRA, GHANA"
    )

    add_heading_styled(doc, "Part 1: How Croe Works for Your Shop", level=1)
    add_body_p(doc, "Stop losing qualified customers to the 'Send the MoMo first' standoff. When selling smartphones, sneakers, or fashion on WhatsApp and Instagram, buyers refuse to pay upfront due to scam fears, and you cannot dispatch without payment. Croe solves this standoff by holding the buyer's money securely until delivery is confirmed, then paying your MoMo wallet automatically.", bold_prefix="The Conversion Pitch: ")

    t_steps = doc.add_table(rows=5, cols=3)
    for i, h in enumerate(["Step", "What You Do", "What the Buyer Experiences"]):
        t_steps.cell(0, i).paragraphs[0].text = h
    rows_steps = [
        ("1. Create Link", "Generate escrow link in Croe app (10 sec)", "Receives link in WhatsApp/IG DM with item details."),
        ("2. Buyer Pays", "You see funds are locked and guaranteed", "Authorizes payment via standard MoMo prompt (MTN, Telecel, AirtelTigo)."),
        ("3. Dispatch", "Send your dispatch rider with peace of mind", "Tracks delivery knowing their money is protected."),
        ("4. Cashout", "Delivery confirmed -> Instant MoMo payout", "Taps 'Received' in browser/app -> MoMo hits your wallet.")
    ]
    for r_idx, r_data in enumerate(rows_steps, start=1):
        for c_idx, val in enumerate(r_data):
            t_steps.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_steps, header_bg=COLOR_NAVY_HEX)

    add_heading_styled(doc, "Transparent Pricing: 2.0% Flat Fee", level=1)
    t_fee = doc.add_table(rows=5, cols=3)
    for i, h in enumerate(["Feature", "Croe Escrow", "Traditional Way (Direct MoMo)"]):
        t_fee.cell(0, i).paragraphs[0].text = h
    rows_fee = [
        ("Setup Fee", "GHS 0.00 (Free)", "GHS 0.00"),
        ("Monthly Subscription", "GHS 0.00 (Free)", "GHS 0.00"),
        ("Fee on Completed Sale", "Flat 2.0% (e.g. GHS 24 on GHS 1,200 order)", "0% (but you lose 25% of sales)"),
        ("Cancelled / Refunded Order", "GHS 0.00 (Free)", "Wasted rider fees, lost stock")
    ]
    for r_idx, r_data in enumerate(rows_fee, start=1):
        for c_idx, val in enumerate(r_data):
            t_fee.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_fee, header_bg=COLOR_BLUE_HEX)

    add_heading_styled(doc, "Part 2: Non-Binding Letter of Intent (LOI)", level=1)
    add_body_p(doc, "This is a non-binding statement of intent for participation in the Croe 60-day vendor pilot. It does not create financial or legal obligations on either party.")

    add_body_p(doc, "If Croe launches and functions as described, I intend to use it for my online sales and accept the standard commission of 2.0% on completed, successfully released orders.", bold_prefix="Statement of Intent: ")

    t_form = doc.add_table(rows=7, cols=2)
    for i, h in enumerate(["Vendor Detail", "Response"]):
        t_form.cell(0, i).paragraphs[0].text = h
    rows_form = [
        ("Business / Trading Name", "__________________________________________________"),
        ("Goods Sold (Phones / Sneakers / Fashion)", "__________________________________________________"),
        ("Instagram / TikTok Handle", "__________________________________________________"),
        ("WhatsApp Contact Number", "__________________________________________________"),
        ("Approximate Orders per Month", "__________________________________________________"),
        ("Average Order Value (GHS)", "__________________________________________________")
    ]
    for r_idx, r_data in enumerate(rows_form, start=1):
        for c_idx, val in enumerate(r_data):
            t_form.cell(r_idx, c_idx).paragraphs[0].text = val
    style_table(t_form)

    add_body_p(doc, "Signature: ___________________________          Date: ___________________________", space_after=12)
    add_body_p(doc, "Representative Name: ___________________________", space_after=16)

    add_footer(doc, "Vendor Pilot Guide & Agreement")
    out_file = os.path.join(PITCH_DIR, "Croe_Vendor_Pilot_Agreement.docx")
    doc.save(out_file)
    print(f"Generated: {out_file}")

if __name__ == "__main__":
    generate_one_pager_docx()
    generate_financial_model_docx()
    generate_banking_brief_docx()
    generate_vendor_agreement_docx()
    print("All Word documents generated successfully!")
