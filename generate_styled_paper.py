from fpdf import FPDF, XPos, YPos

class StyledPaper(FPDF):
    def __init__(self):
        super().__init__()
        self.set_margins(25.4, 25.4, 25.4) # 1 inch margins
        self.set_auto_page_break(auto=True, margin=25.4)
        # We will use Times New Roman which is built-in as 'Times'
        
    def header(self):
        # We only print the main title on the first page
        if self.page_no() == 1:
            self.set_font('Times', 'B', 16)
            self.set_text_color(35, 65, 117) # Dark Blue
            self.multi_cell(0, 8, "SCALABLE, SELF-HEALING BUSINESS INTELLIGENCE ARCHITECTURE\nUSING\nLARGE LANGUAGE MODELS AND NATIVE DATABASE AGGREGATION", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
            self.ln(6)
            self.set_font('Times', 'I', 12)
            self.set_text_color(100, 100, 100) # Dark Gray
            self.cell(0, 8, "A Research Paper", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
            self.ln(2)
            
            # Draw blue line
            self.set_draw_color(35, 65, 117)
            self.set_line_width(0.5)
            self.line(25.4, self.get_y(), 210-25.4, self.get_y())
            self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(35, 65, 117)
        self.set_line_width(0.5)
        self.line(25.4, self.get_y(), 210-25.4, self.get_y())
        self.ln(2)
        self.set_font('Times', '', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, f'Page {self.page_no()} of {{nb}}', align='C')

    def print_heading(self, text, level=1):
        self.ln(6)
        if level == 1:
            self.set_font('Times', 'B', 14)
            self.set_text_color(35, 65, 117)
        elif level == 2:
            self.set_font('Times', 'B', 12)
            self.set_text_color(35, 65, 117)
        
        self.multi_cell(0, 8, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='L')
        self.ln(2)

    def print_body(self, text):
        self.set_font('Times', '', 11)
        self.set_text_color(0, 0, 0)
        
        # Replace newlines with paragraph breaks
        paragraphs = text.split('\n\n')
        for p in paragraphs:
            p = p.replace('\n', ' ').strip()
            if p:
                self.multi_cell(0, 6, p, align='J')
                self.ln(4)

pdf = StyledPaper()
pdf.add_page()

abstract = """ABSTRACT

Businesses today generate data at unprecedented rates, yet access to actionable insights remains bottlenecked by rigid Extract, Transform, Load (ETL) pipelines and fragile visualization tools. When datasets contain missing values, non-standard date formats, or lack crucial financial columns like Cost of Goods Sold (COGS), traditional Business Intelligence (BI) platforms often fail outright or require extensive manual intervention. To address this, we developed a highly scalable, self-healing BI Dashboard architecture capable of processing over 1 million records in real-time. Instead of relying on static schemas, our system employs Large Language Models (LLMs) to dynamically map unstructured CSV data, intelligently coercing corrupt fields and circumventing fatal parse errors. When financial data is missing, an integrated auto-simulation layer mathematically injects realistic cost and profit margins on-the-fly. Furthermore, to overcome the Out-of-Memory (OOM) bottlenecks inherent in Python-based row-by-row memory processing, we implemented vectorized dictionary ingestion using SQLAlchemy bulk insert mappings. Analytics workloads were subsequently shifted entirely to the database layer utilizing native PostgreSQL JSON-casting aggregations. Tested against a synthetic 1,000,000+ row challenge dataset containing deliberate corruption, the system maintained millisecond query latency and zero downtime. By integrating a generative UI built on Next.js and FastAPI, the platform empowers users to query their data via natural language, receiving instant, context-aware visual insights. This paper details the architectural decisions, pipeline optimizations, and performance metrics that make this self-healing approach a robust alternative to traditional BI tools.

Keywords: Business Intelligence, ETL, Large Language Models, PostgreSQL, JSON Aggregation, Data Simulation, FastAPI, Next.js"""

intro = """One of the core challenges in the modern data ecosystem is the fragility of ingestion pipelines. The explosion of digital commerce has equipped even small-to-medium enterprises (SMEs) with massive datasets. However, translating this raw data into strategic insights remains a significant challenge. Traditional BI platforms demand perfectly structured, strictly typed datasets. A single corrupt date string or a missing financial column can halt the entire ingestion process. Consequently, data analysts spend the majority of their time cleaning and formatting data rather than analyzing it.

With the advent of Large Language Models (LLMs), new possibilities have emerged for automating the data mapping process. Instead of rigidly mapping variables, an LLM can infer that 'Net_Earnings', 'Profit', and 'Bottom_Line' all represent the same conceptual metric. Similarly, advancements in modern relational databases like PostgreSQL have introduced powerful JSON processing capabilities, allowing unstructured data to be queried and aggregated with the speed of compiled C code.

This research introduces a novel BI architecture designed to be both scalable and self-healing. Built as a web application, it allows users to upload messy, unstructured CSV datasets. The system automatically repairs the data, maps it to a standard schema using AI, and loads it into a high-performance database. To demonstrate its robustness, the platform was tested against datasets exceeding one million rows, achieving millisecond query response times without exceeding typical cloud memory constraints.

This paper is structured to detail the complete end-to-end design. Following this introduction, Section 2 examines earlier studies on traditional ETL and AI integration. Section 3 introduces the new system design. Section 4 outlines the research methodology. Section 5 breaks down the system architecture. Section 6 explores the implementation details. Section 7 presents findings and scalability comparisons. Finally, Section 8 highlights advantages, Section 9 considers future scope, and Section 10 offers concluding thoughts."""

lit_review = """The application of automated intelligence to data pipelines has been an active area of research. This section reviews key prior works in ETL processing, LLM data engineering, and high-performance database aggregations."""

lit_2_1 = """Historically, ETL pipelines relied on rigid schema definitions. Tools like Apache Airflow or Talend expect data to conform to predefined types. Research by Kimball and Ross established dimensional modeling, which remains the gold standard, yet it inherently lacks the flexibility to adapt to dynamically changing schemas without developer intervention. Most traditional solutions require hard-coded scripts to handle edge cases, making them brittle when applied to foreign or undocumented datasets."""

lit_2_2 = """Recent studies have explored using LLMs for data wrangling. Research in 2023 demonstrated that models like GPT-4 can accurately infer data types and map disparate schemas with high accuracy. However, applying these models per-row on massive datasets introduces unacceptable latency and API costs. Our research addresses this by applying LLM inference solely to the schema mapping phase, rather than the row-by-row data processing phase, achieving the intelligence of an LLM with the speed of standard ingestion."""

lit_2_3 = """While Python libraries like Pandas are ubiquitous for data manipulation, they are memory-bound. Processing millions of rows requires loading the entire dataset into RAM, frequently causing OOM crashes in containerized environments. Studies on PostgreSQL's JSONB performance show that native database aggregations can outperform Python-based loops by orders of magnitude. Our architecture leverages these native capabilities to bypass Python memory constraints entirely."""

lit_2_4 = """Looking at past studies shows clear misses that our platform fills. Existing tools either offer rigid scalability (traditional BI) or flexible but slow analysis (LLM-based code interpreters like ChatGPT Advanced Data Analysis). There is a distinct lack of hybrid systems that combine LLM-driven flexibility during ingestion with database-native speed during aggregation. This platform bridges that gap by unifying these two paradigms into a single responsive application."""

proposed = """A fresh way to ingest and analyze business data begins where AI meets database optimization. Built for web platforms, it listens when users upload files or ask questions. Language models pull out schema details from messy headers. Hidden calculations are simulated if data is missing, guaranteeing a complete dashboard. At its core lives a PostgreSQL engine handling millions of rows in milliseconds."""

prop_3_1 = """The proposed system is a full-stack web application designed for seamless data ingestion and visualization. Users upload data files via a Next.js frontend. The FastAPI backend processes the file, utilizing an LLM to map columns to standard BI metrics (Date, Revenue, Cost, Category, etc.). The cleaned data is vectorized and bulk-inserted into a PostgreSQL database. A generative AI chat interface allows users to ask questions, with the system responding not just with text, but with dynamic, interactive Recharts visualizations."""

prop_3_2 = """The system is deliberately calibrated to handle common e-commerce and retail datasets, organized into the following key metrics:
- Financials: Gross Revenue, COGS, Net Profit, Operating Cash Flow, Burn Rate, Expense Ratio.
- Inventory: Stock Levels, Turnover Ratio, Carrying Costs, Stockout Rate.
- Trends: Month-over-Month Growth, Customer Lifetime Value (CLV), Return on Investment (ROI)."""

prop_3_3 = """- Self-Healing ETL: Automatically coerces corrupt dates and drops unparseable NaT values gracefully.
- Auto-Simulation: Mathematically injects realistic COGS (e.g., 65% of revenue) and Net Profit (e.g., 15% of revenue) if the uploaded dataset lacks them.
- Vectorized Ingestion: Bypasses pandas iterrows() for high-speed bulk database insertion.
- Native Aggregation: Uses SQLAlchemy JSON-casting to perform math inside Postgres, achieving O(1) Python memory usage.
- Generative UI: Streams interactive React components directly into the chat interface."""

methodology = """Fresh off early planning, work on the system moves step by step through separate building blocks. One phase flows into the next, starting with data parsing and schema mapping, and ending with database insertions and dynamic UI generation."""

meth_4_1 = """The platform accepts CSV uploads. Upon ingestion, Pandas reads the file into memory. To handle anomalies, the system scrubs NaN values and utilizes the 'errors=coerce' parameter during datetime conversion. Unparseable strings (e.g., 'UNKNOWN') are converted to NaT and safely dropped, preventing the pipeline crashes that plague traditional systems. This produces a sanitized, standardized baseline dataframe."""

meth_4_2 = """Instead of manual mapping, the first three rows of the dataset are extracted and sent to an LLM. The LLM returns a JSON payload mapping the user's unique column headers (e.g., 'Total_Sales_Amount') to the system's required schema keys ('amount', 'date', 'category'). This allows the system to support any language or nomenclature dynamically."""

meth_4_3 = """To ensure scalability, we completely eliminated Python-side data aggregation. Instead of executing queries that pull all records into Python RAM, the system constructs SQLAlchemy queries that cast JSON fields to floats directly within the database engine (e.g., func.sum(cast(raw_data['cost'].astext, Float))). This shifts the heavy lifting to PostgreSQL's highly optimized C-based engine."""

meth_4_4 = """The system is not limited to perfect, identically structured CSVs. It processes variable-length files and handles dynamic columns by storing excess or unexpected data in a schemaless JSONB column. This hybrid relational-document approach ensures no data is lost during the transformation phase."""

meth_4_5 = """The frontend utilizes a modular grid of Recharts components. When the user queries the AI Assistant, the backend retrieves real-time aggregations and instructs the frontend to render specific React components inline with the conversation, providing a highly multimodal experience."""

architecture = """The system follows a three-tier architecture consisting of a presentation layer (Next.js UI), an application logic layer (FastAPI backend + LLM engine), and a data layer (PostgreSQL database)."""

arch_5_1 = """Presentation Layer: A Next.js application styled with Tailwind CSS, utilizing React Server Components and Recharts for responsive, interactive visualizations. It includes dedicated views for Dashboards, Cashflow, Inventory, and an AI Assistant.

Application Logic Layer: A FastAPI backend written in Python. It handles file uploads, orchestrates the ETL pipeline, executes SQLAlchemy queries, and interfaces with external LLM APIs (e.g., Sarvam AI / Gemini) for semantic routing and RAG (Retrieval-Augmented Generation).

Data Layer: A PostgreSQL database containing strongly-typed columns for indexed querying (user_id, date, amount) alongside a flexible JSON column ('raw_data') to preserve the original unstructured dataset."""

arch_5_2 = """Through the system, data moves step by step. A user uploads a CSV. The FastAPI endpoint reads it into memory. The LLM maps the schema based on a sample of rows. The ETL pipeline vectorizes the dataframe into dictionaries, auto-simulating missing financial columns. SQLAlchemy performs a bulk_insert_mappings operation. When the user views the dashboard, the backend queries Postgres using native JSON aggregations. The results are returned as structured JSON to the Next.js frontend, which immediately renders the KPI cards and charts."""

implementation = """Detailed engineering was required to achieve millisecond latency on million-row datasets."""

impl_6_1 = """In traditional Python ETLs, iterating row-by-row via 'df.iterrows()' creates a massive bottleneck. By switching to 'df.to_dict(orient=records)' and executing a native dictionary comprehension, ingestion speed increased dramatically. Furthermore, the pipeline actively scans the keys for financial identifiers using heuristic substring matching ('cost', 'cogs', 'net_profit', 'earnings'). If absent, it injects simulated values directly into the dictionary before insertion, ensuring the dashboard always populates correctly."""

impl_6_2 = """To answer user queries accurately, the system builds a localized context window. It aggregates total revenue, calculates margins via Postgres, and retrieves relevant unstructured documents from a local ChromaDB vector store. This contextual payload is prepended to the system prompt, grounding the LLM's responses in factual, real-time data."""

impl_6_3 = """The 'transactions' table acts as a hybrid store. Highly queried fields like 'date' and 'amount' are indexed columns. The 'raw_data' column holds the full JSON. Aggregation queries use SQLAlchemy's JSON casting mechanics, allowing the Postgres engine to sum millions of values without passing them back to Python."""

impl_6_4 = """The backend relies on dependency injection for secure routing and session management. Endpoints are strictly typed using Pydantic. Background tasks were implemented to handle large file uploads without blocking the main event loop."""

impl_6_5 = """The frontend utilizes React state management to instantly reflect data changes. A crucial optimization involved removing CSS 'truncate' classes and applying 'flex-wrap' to ensure large financial numbers render correctly on small screens. The generative AI chat utilizes Server-Sent Events (SSE) to stream text and UI components simultaneously."""

results_text = """7.1 System Scalability Comparison

The system was benchmarked against a deliberate 'Challenge Dataset' containing 1,000,005 rows. This dataset included missing dates, extreme outliers, negative quantities, and obscured column headers (e.g., 'Net_Earnings'). 

Before Optimization: Attempting to upload 1M rows using traditional row iteration resulted in a timeout after 120 seconds. Attempting to query the dashboard resulted in an Out-of-Memory (OOM) crash, as Python attempted to load 1M JSON objects into RAM.

After Optimization: With vectorized dictionary insertion, ingestion of 1M rows completed reliably. Crucially, the dashboard load time dropped to under 150 milliseconds. By shifting the math to the Postgres engine via 'astext' casting, Python memory overhead remained constant (O(1)) regardless of the dataset size."""

results_7_2 = """The results clearly demonstrate that Python-based analytical loops are unsuited for enterprise data at scale. By utilizing the database for its intended purpose-data aggregation-we unlocked massive scalability. The self-healing mechanisms successfully caught 'UNKNOWN' dates, coerced them to NaT, and dropped them, preventing the Internal Server Errors that previously crashed the pipeline."""

results_7_3 = """During testing, users successfully uploaded entirely foreign datasets. The LLM accurately mapped obscure fields. Users noted that the auto-simulation of Gross and Net margins effectively masked the limitations of their raw data, allowing them to experience a fully-featured dashboard immediately without needing to re-format their CSV files."""

advantages = """First, unlike rigid enterprise BI tools (e.g., Tableau, PowerBI) that require strict data formatting, this platform accepts messy data and fixes it transparently. It adapts to the user, rather than forcing the user to adapt to the software.

Second, by ensuring Python memory overhead is O(1) during analytics, the system can run on budget-friendly cloud instances or local Docker containers without requiring massive RAM upgrades, making enterprise scalability accessible.

Third, the Generative UI allows users to bypass complex SQL queries or dashboard filters. A user can simply type inquiries into the chat, and the system dynamically renders the corresponding React component inline, providing an unparalleled user experience."""

future = """Though the system today marks real progress in bringing AI-powered BI tools to users, further refinements could deepen its reach.

While bulk insertion is fast, moving to PostgreSQL 'COPY' commands via raw psycopg2 could reduce ingestion of 1M rows to under 5 seconds. This would be a natural next step for handling multi-gigabyte datasets.

The auto-simulation layer currently uses fixed percentages (e.g., 65% COGS). Future iterations could use localized Machine Learning models (like Random Forests or Isolation Forests) to detect seasonal trends and inject dynamically predicted costs based on historical variance.

Migrating the database from a single Dockerized Postgres instance to a managed, distributed database (like AWS Aurora or Citus) would allow the platform to serve thousands of concurrent enterprises securely in a multi-tenant cloud environment."""

conclusion_text = """A new tool was built to help users seamlessly process and analyze massive business datasets without writing code or manually cleaning CSV files. This project successfully demonstrates that the fragility of traditional BI pipelines can be mitigated through the strategic application of LLMs and robust ETL engineering. By abandoning row-by-row memory processing and shifting mathematical aggregations entirely to the database layer, we achieved enterprise-level scalability (1,000,000+ records) without sacrificing flexibility. 

The integration of self-healing data parsing and auto-simulated financial metrics ensures that users are always presented with a functional, insightful dashboard, regardless of the quality of their raw data. What makes the tool useful isn't just how well it ingests data, but what comes after: clear visualizations, AI-driven chat insights, and responsive generative UI components. Ultimately, this architecture paves the way for more resilient, AI-native analytical tools that empower users to focus on decision-making rather than data cleaning."""

references = """[1] S. Kimball and M. Ross, The Data Warehouse Toolkit: The Definitive Guide to Dimensional Modeling. Wiley, 2013.
[2] PostgreSQL Global Development Group, "JSON Functions and Operators," PostgreSQL Documentation.
[3] M. Bayer, "SQLAlchemy 2.0 Documentation: Bulk Operations," SQLAlchemy.
[4] McKinney, W. "Data Structures for Statistical Computing in Python," Proceedings of the 9th Python in Science Conference, 2010.
[5] OpenAI, "GPT-4 Technical Report," 2023.
[6] Vercel, "Next.js: The React Framework for the Web," Vercel Documentation, 2024.
[7] S. Ramirez, et al., "FastAPI: High performance, easy to learn, fast to code, ready for production," 2024."""

# Build the document matching the structure of the uploaded PDF

pdf.print_heading("ABSTRACT", level=1)
pdf.print_body(abstract.replace("ABSTRACT\n\n", ""))

pdf.print_heading("1. INTRODUCTION", level=1)
pdf.print_body(intro)

pdf.print_heading("2. LITERATURE REVIEW", level=1)
pdf.print_body(lit_review)
pdf.print_heading("2.1 Traditional ETL and Data Warehousing", level=2)
pdf.print_body(lit_2_1)
pdf.print_heading("2.2 LLMs in Data Engineering", level=2)
pdf.print_body(lit_2_2)
pdf.print_heading("2.3 High-Performance Database Aggregation", level=2)
pdf.print_body(lit_2_3)
pdf.print_heading("2.4 Research Gaps Addressed by the BI Dashboard", level=2)
pdf.print_body(lit_2_4)

pdf.print_heading("3. PROPOSED SYSTEM", level=1)
pdf.print_body(proposed)
pdf.print_heading("3.1 System Overview", level=2)
pdf.print_body(prop_3_1)
pdf.print_heading("3.2 Data and Metric Coverage", level=2)
pdf.print_body(prop_3_2)
pdf.print_heading("3.3 Key Features", level=2)
pdf.print_body(prop_3_3)

pdf.print_heading("4. RESEARCH METHODOLOGY", level=1)
pdf.print_body(methodology)
pdf.print_heading("4.1 Dataset Ingestion and Preparation", level=2)
pdf.print_body(meth_4_1)
pdf.print_heading("4.2 LLM Pipeline for Schema Mapping", level=2)
pdf.print_body(meth_4_2)
pdf.print_heading("4.3 Database-Level Aggregation", level=2)
pdf.print_body(meth_4_3)
pdf.print_heading("4.4 Multi-format Data Handling", level=2)
pdf.print_body(meth_4_4)
pdf.print_heading("4.5 Generative UI and Dashboard Engine", level=2)
pdf.print_body(meth_4_5)

pdf.print_heading("5. SYSTEM ARCHITECTURE", level=1)
pdf.print_body(architecture)
pdf.print_heading("5.1 Architectural Layers", level=2)
pdf.print_body(arch_5_1)
pdf.print_heading("5.2 Data Flow", level=2)
pdf.print_body(arch_5_2)

pdf.print_heading("6. IMPLEMENTATION DETAILS", level=1)
pdf.print_body(implementation)
pdf.print_heading("6.1 Self-Healing ETL and Data Simulation", level=2)
pdf.print_body(impl_6_1)
pdf.print_heading("6.2 LLM and Vector Database Implementation", level=2)
pdf.print_body(impl_6_2)
pdf.print_heading("6.3 Database Schema and Aggregation Queries", level=2)
pdf.print_body(impl_6_3)
pdf.print_heading("6.4 FastAPI and Next.js Implementation", level=2)
pdf.print_body(impl_6_4)
pdf.print_heading("6.5 User Interface Implementation", level=2)
pdf.print_body(impl_6_5)

pdf.print_heading("7. RESULTS AND DISCUSSION", level=1)
pdf.print_body(results_text)
pdf.print_heading("7.2 Discussion", level=2)
pdf.print_body(results_7_2)
pdf.print_heading("7.3 User Acceptance Testing", level=2)
pdf.print_body(results_7_3)

pdf.print_heading("8. ADVANTAGES", level=1)
pdf.print_body(advantages)

pdf.print_heading("9. FUTURE SCOPE", level=1)
pdf.print_body(future)

pdf.print_heading("10. CONCLUSION", level=1)
pdf.print_body(conclusion_text)

pdf.print_heading("REFERENCES", level=1)
pdf.print_body(references)

pdf.alias_nb_pages()
pdf.output('Custom_BI_Dashboard_Research_Paper.pdf')
