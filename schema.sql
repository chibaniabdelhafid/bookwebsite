--
-- PostgreSQL database dump
--

\restrict uYOxZxGEbAVaxaTltFgpSflQG5bbCwcSdCkLbje8W8LGyd7ZKRwQyRcvrzk26yV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: claim_sheet_sync(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_sheet_sync(p_order_id bigint, p_window_seconds integer DEFAULT 3) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
declare
  v_claimed boolean;
begin
  update orders
    set sheet_synced_at = now()
    where id = p_order_id
      and (sheet_synced_at is null or sheet_synced_at < now() - (p_window_seconds || ' seconds')::interval)
  returning true into v_claimed;
  return coalesce(v_claimed, false);
end;
$$;


--
-- Name: decrement_stock(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_stock(book_id integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE books
  SET stock = GREATEST(stock - 1, 0)
  WHERE id = book_id;
END;
$$;


--
-- Name: decrement_stock(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_stock(p_book_id integer, p_qty integer) RETURNS void
    LANGUAGE sql
    AS $$
  update books set stock = greatest(stock - p_qty, 0) where id = p_book_id;
$$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEW.id::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid NOT NULL
);


--
-- Name: book_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_bundles (
    id bigint NOT NULL,
    book_id bigint NOT NULL,
    qty integer NOT NULL,
    price integer NOT NULL,
    label text,
    free_delivery boolean DEFAULT false,
    badge text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    qias_choice text
);


--
-- Name: book_bundles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.book_bundles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: book_bundles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.book_bundles_id_seq OWNED BY public.book_bundles.id;


--
-- Name: book_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_images (
    id bigint NOT NULL,
    book_id bigint NOT NULL,
    url text NOT NULL,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: book_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.book_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: book_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.book_images_id_seq OWNED BY public.book_images.id;


--
-- Name: book_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_options (
    id bigint NOT NULL,
    book_id bigint,
    label text NOT NULL,
    choices jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    affects_price boolean DEFAULT false
);


--
-- Name: book_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.book_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: book_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.book_options_id_seq OWNED BY public.book_options.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id bigint NOT NULL,
    title text NOT NULL,
    author text,
    price integer DEFAULT 0 NOT NULL,
    promotion integer,
    image_url text,
    category text,
    categories text[],
    rating integer DEFAULT 0,
    pages text DEFAULT 0,
    publisher text,
    qias text,
    description text,
    "paperType" text,
    tahqiq text,
    bestseller boolean DEFAULT false,
    free_delivery boolean DEFAULT false,
    stock integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    wholesale_available boolean DEFAULT false NOT NULL
);


--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.books_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'category'::text
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_settings (
    id bigint NOT NULL,
    home_price numeric DEFAULT 0,
    dhd_price numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_settings_id_seq OWNED BY public.delivery_settings.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    book_id bigint,
    title text,
    qty integer DEFAULT 1,
    price integer DEFAULT 0,
    selected_options jsonb
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    order_number text DEFAULT ('ORD-'::text || (floor(((random() * (900000)::double precision) + (100000)::double precision)))::text),
    name text,
    phone text,
    wilaya text,
    commune text,
    address text,
    notes text,
    total integer DEFAULT 0,
    delivery_price numeric DEFAULT 0,
    status text DEFAULT 'Attente'::text,
    livraison text DEFAULT 'domicile'::text,
    abandoned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    book_id bigint,
    bundle_qty integer DEFAULT 1,
    bundle_label text,
    selected_options jsonb,
    sheet_synced_at timestamp with time zone
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: wilaya_delivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wilaya_delivery (
    id bigint NOT NULL,
    wilaya text NOT NULL,
    home_price integer DEFAULT 0,
    dhd_price integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: wilaya_delivery_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wilaya_delivery_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wilaya_delivery_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wilaya_delivery_id_seq OWNED BY public.wilaya_delivery.id;


--
-- Name: book_bundles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bundles ALTER COLUMN id SET DEFAULT nextval('public.book_bundles_id_seq'::regclass);


--
-- Name: book_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_images ALTER COLUMN id SET DEFAULT nextval('public.book_images_id_seq'::regclass);


--
-- Name: book_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_options ALTER COLUMN id SET DEFAULT nextval('public.book_options_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: delivery_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_settings ALTER COLUMN id SET DEFAULT nextval('public.delivery_settings_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: wilaya_delivery id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wilaya_delivery ALTER COLUMN id SET DEFAULT nextval('public.wilaya_delivery_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id) FROM stdin;
abbc3a6c-a7ce-4367-a949-b1d2635ac395
\.


--
-- Data for Name: book_bundles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.book_bundles (id, book_id, qty, price, label, free_delivery, badge, active, created_at, qias_choice) FROM stdin;
1	47	10	8500	10 مصاحف	f	تخفيض 1500 دج	t	2026-07-01 22:34:02.034449+00	\N
2	47	20	16300	20 مصحف	f	تخفيض2700 دج	t	2026-07-01 22:34:42.707438+00	\N
3	48	10	17000	10 مصاحف	f	\N	t	2026-07-01 22:38:33.249138+00	\N
4	48	20	33500	20 نسخة	f	تخفيض	t	2026-07-01 22:39:25.764718+00	\N
5	48	36	59400	كرتون 36 مصحف	t	تخفيض مع تزصيل مجاني	t	2026-07-01 22:40:19.351116+00	\N
6	47	1	1500	مصحف 17/25	f	\N	t	2026-07-01 22:41:49.312111+00	\N
10	50	10	10000	10 مصاحف 	f	قياس 14/20	t	2026-07-01 22:52:26.389521+00	\N
11	51	1	2500	قياس 14/20 	f	رواية ورش	t	2026-07-01 23:14:55.992251+00	\N
12	51	1	2650	قياس 14/20 	f	رواية حفص	t	2026-07-01 23:15:22.007786+00	\N
13	51	1	3900	قياس 17/25	f	رواية حفص	t	2026-07-01 23:15:46.875973+00	\N
14	55	1	4750	قياس 17/25	f	\N	t	2026-07-02 19:53:31.497407+00	\N
15	55	1	5750	قياس 25/35	f	\N	t	2026-07-02 19:53:50.362499+00	\N
16	64	10	8900	10 مصاحف	f	تخفيض 600 دج	t	2026-07-02 20:51:40.255177+00	\N
17	64	20	17400	20 مصحف	f	تخفيض 1600 دج	t	2026-07-02 20:52:14.529258+00	\N
18	64	44	36300	كرتون (44 مصحف)	t	تخفيض وتوصيل مجاني	t	2026-07-02 20:53:21.605246+00	\N
20	74	2	4000	نسختان	f	تخفيض 400 دج	t	2026-07-13 21:21:28.18058+00	\N
21	99	1	16000	اضافة صحيح مسلم من نفس الطبعة	t	استفد من تخفيض صحيح مسلم بسعر 3100 دج	t	2026-08-21 15:19:40.685039+00	\N
23	99	1	16700	اضافة مسند الدارمي الى المجموعة	t	تخفيض مسند الدارمي الى 3800 دج	t	2026-08-21 15:25:14.901058+00	\N
\.


--
-- Data for Name: book_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.book_images (id, book_id, url, "position", created_at) FROM stdin;
4	5	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332299610_0.JPG	0	2026-06-24 20:20:37.816057+00
5	5	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332311284_1.JPG	1	2026-06-24 20:20:37.816057+00
6	5	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332324883_2.JPG	2	2026-06-24 20:20:37.816057+00
7	5	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332353298_3.JPG	3	2026-06-24 20:20:37.816057+00
8	5	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332390820_4.JPG	4	2026-06-24 20:20:37.816057+00
9	6	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/6/1782333004397_0.JPG	0	2026-06-24 20:30:59.625743+00
10	6	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/6/1782333023648_1.JPG	1	2026-06-24 20:30:59.625743+00
11	6	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/6/1782333105021_0.JPG	2	2026-06-24 20:32:30.454713+00
12	6	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/6/1782333125008_1.JPG	3	2026-06-24 20:32:30.454713+00
14	8	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/8/1782487653312_0.JPG	0	2026-06-26 15:30:48.886219+00
15	8	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/8/1782487748094_1.JPG	1	2026-06-26 15:30:48.886219+00
16	8	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/8/1782487813845_2.JPG	2	2026-06-26 15:30:48.886219+00
21	9	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/9/1782488276249_1.jpg	1	2026-06-26 15:38:31.007776+00
22	9	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/9/1782488302706_2.jpg	2	2026-06-26 15:38:31.007776+00
23	9	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/9/1782488478390_0.jpg	2	2026-06-26 15:41:28.996486+00
24	10	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/10/1782491088291_0.JPG	0	2026-06-26 16:25:20.452517+00
25	10	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/10/1782491092869_1.JPG	1	2026-06-26 16:25:20.452517+00
26	10	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/10/1782491097331_2.JPG	2	2026-06-26 16:25:20.452517+00
27	11	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/11/1782491653331_0.JPG	0	2026-06-26 16:34:21.011262+00
28	11	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/11/1782491657485_1.JPG	1	2026-06-26 16:34:21.011262+00
29	11	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/11/1782491663610_2.JPG	2	2026-06-26 16:34:21.011262+00
30	12	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/12/1782492295351_0.jpg	0	2026-06-26 16:44:58.614137+00
31	13	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/13/1782492522841_0.jpg	0	2026-06-26 16:48:50.69449+00
32	13	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/13/1782492526251_1.jpg	1	2026-06-26 16:48:50.69449+00
33	14	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/14/1782493124750_0.jpg	0	2026-06-26 16:59:01.806607+00
34	14	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/14/1782493133066_1.jpg	1	2026-06-26 16:59:01.806607+00
35	14	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/14/1782493140608_2.jpg	2	2026-06-26 16:59:01.806607+00
36	15	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/15/1782494001223_0.JPG	0	2026-06-26 17:13:32.686888+00
37	15	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/15/1782494004731_1.JPG	1	2026-06-26 17:13:32.686888+00
38	16	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/16/1782494240906_0.jpg	0	2026-06-26 17:17:31.37946+00
39	16	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/16/1782494245373_1.jpg	1	2026-06-26 17:17:31.37946+00
40	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494715470_0.jpg	0	2026-06-26 17:26:01.234171+00
41	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494723792_1.jpg	1	2026-06-26 17:26:01.234171+00
42	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494732700_2.jpg	2	2026-06-26 17:26:01.234171+00
43	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494818773_0.jpg	3	2026-06-26 17:27:37.103116+00
44	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494825303_1.jpg	4	2026-06-26 17:27:37.103116+00
45	17	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494831270_2.jpg	5	2026-06-26 17:27:37.103116+00
46	18	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/18/1782495442350_0.jpg	0	2026-06-26 17:37:42.459369+00
47	18	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/18/1782495451026_1.jpg	1	2026-06-26 17:37:42.459369+00
48	19	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/19/1782495797098_0.jpg	0	2026-06-26 17:43:29.021052+00
49	20	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/20/1782496308391_0.jpg	0	2026-06-26 17:52:11.082268+00
50	20	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/20/1782496319024_1.jpg	1	2026-06-26 17:52:11.082268+00
51	21	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/21/1782496539434_0.JPG	0	2026-06-26 17:55:50.334044+00
52	21	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/21/1782496544705_1.JPG	1	2026-06-26 17:55:50.334044+00
53	22	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/22/1782496830474_0.jpg	0	2026-06-26 18:00:39.864634+00
54	22	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/22/1782496833332_1.jpg	1	2026-06-26 18:00:39.864634+00
55	23	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/23/1782497039521_0.jpg	0	2026-06-26 18:04:34.586331+00
56	23	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/23/1782497059979_1.jpg	1	2026-06-26 18:04:34.586331+00
57	24	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/24/1782497420883_0.jpg	0	2026-06-26 18:10:51.057992+00
58	24	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/24/1782497428072_1.jpg	1	2026-06-26 18:10:51.057992+00
59	24	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/24/1782497442064_2.jpg	2	2026-06-26 18:10:51.057992+00
60	25	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/25/1782503760207_0.jpg	0	2026-06-26 19:56:05.653949+00
61	25	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/25/1782503762106_1.jpg	1	2026-06-26 19:56:05.653949+00
62	26	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/26/1782503822375_0.jpg	0	2026-06-26 19:57:05.287994+00
63	27	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/27/1782504037776_0.jpg	0	2026-06-26 20:00:44.184389+00
64	27	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/27/1782504042108_1.jpg	1	2026-06-26 20:00:44.184389+00
65	28	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/28/1782504315423_0.jpg	0	2026-06-26 20:05:24.2858+00
66	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504534757_0.jpg	0	2026-06-26 20:09:10.115556+00
67	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504537494_1.jpg	1	2026-06-26 20:09:10.115556+00
68	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504544296_2.jpg	2	2026-06-26 20:09:10.115556+00
69	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504584098_0.jpg	3	2026-06-26 20:10:26.296722+00
70	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504611730_1.jpg	4	2026-06-26 20:10:26.296722+00
71	29	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504619250_2.jpg	5	2026-06-26 20:10:26.296722+00
72	30	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/30/1782591318167_0.jpg	0	2026-06-27 20:15:22.318948+00
73	30	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/30/1782591319956_1.jpg	1	2026-06-27 20:15:22.318948+00
74	31	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/31/1782591698999_0.jpg	0	2026-06-27 20:21:47.284409+00
75	31	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/31/1782591703554_1.jpg	1	2026-06-27 20:21:47.284409+00
76	32	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/32/1782591967729_0.jpg	0	2026-06-27 20:26:19.25981+00
77	32	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/32/1782591970340_1.jpg	1	2026-06-27 20:26:19.25981+00
78	32	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/32/1782591974813_2.jpg	2	2026-06-27 20:26:19.25981+00
79	33	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/33/1782592401588_0.jpg	0	2026-06-27 20:33:25.667193+00
80	34	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/34/1782592787649_0.jpg	0	2026-06-27 20:39:55.267713+00
81	34	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/34/1782592791122_1.jpg	1	2026-06-27 20:39:55.267713+00
82	35	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/35/1782593095503_0.jpg	0	2026-06-27 20:45:22.653063+00
83	35	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/35/1782593102372_1.jpg	1	2026-06-27 20:45:22.653063+00
84	35	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/35/1782593113477_2.jpg	2	2026-06-27 20:45:22.653063+00
85	36	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/36/1782593376469_0.jpg	0	2026-06-27 20:49:58.069637+00
86	36	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/36/1782593379784_1.jpg	1	2026-06-27 20:49:58.069637+00
87	36	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/36/1782593386564_2.jpg	2	2026-06-27 20:49:58.069637+00
88	36	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/36/1782593390833_3.jpg	3	2026-06-27 20:49:58.069637+00
89	37	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/37/1782593517808_0.jpg	0	2026-06-27 20:52:05.325527+00
90	37	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/37/1782593521403_1.jpg	1	2026-06-27 20:52:05.325527+00
91	38	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/38/1782593825490_0.jpg	0	2026-06-27 20:57:15.259592+00
92	38	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/38/1782593831166_1.jpg	1	2026-06-27 20:57:15.259592+00
93	39	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/39/1782680472666_0.JPG	0	2026-06-28 21:01:23.863923+00
94	39	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/39/1782680476147_1.JPG	1	2026-06-28 21:01:23.863923+00
95	39	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/39/1782680479218_2.JPG	2	2026-06-28 21:01:23.863923+00
96	40	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/40/1782684265192_0.JPG	0	2026-06-28 22:04:39.973661+00
97	40	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/40/1782684271643_1.JPG	1	2026-06-28 22:04:39.973661+00
98	41	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/41/1782684775657_0.png	0	2026-06-28 22:13:12.925535+00
99	41	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/41/1782684782929_1.jpg	1	2026-06-28 22:13:12.925535+00
100	41	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/41/1782684785691_2.jpg	2	2026-06-28 22:13:12.925535+00
101	42	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/42/1782685056841_0.png	0	2026-06-28 22:18:09.595015+00
102	42	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/42/1782685063502_1.JPG	1	2026-06-28 22:18:09.595015+00
103	42	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/42/1782685067087_2.JPG	2	2026-06-28 22:18:09.595015+00
104	42	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/42/1782685075173_3.JPG	3	2026-06-28 22:18:09.595015+00
105	43	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/43/1782917509150_0.png	0	2026-07-01 14:52:31.159683+00
106	43	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/43/1782917518638_1.JPG	1	2026-07-01 14:52:31.159683+00
107	43	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/43/1782917529586_2.JPG	2	2026-07-01 14:52:31.159683+00
108	43	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/43/1782917539087_3.JPG	3	2026-07-01 14:52:31.159683+00
109	44	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/44/1782918453200_0.png	0	2026-07-01 15:07:40.295001+00
110	44	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/44/1782918458000_1.jpg	1	2026-07-01 15:07:40.295001+00
111	44	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/44/1782918458722_2.jpg	2	2026-07-01 15:07:40.295001+00
112	44	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/44/1782918459427_3.jpg	3	2026-07-01 15:07:40.295001+00
113	45	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/45/1782943074463_0.png	0	2026-07-01 21:58:02.509931+00
114	46	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/46/1782943268381_0.png	0	2026-07-01 22:01:21.322149+00
115	47	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/47/1782945158928_0.JPG	0	2026-07-01 22:32:48.14061+00
116	47	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/47/1782945161243_1.JPG	1	2026-07-01 22:32:48.14061+00
117	47	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/47/1782945163928_2.JPG	2	2026-07-01 22:32:48.14061+00
118	47	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/47/1782945166925_3.JPG	3	2026-07-01 22:32:48.14061+00
123	48	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945381575_0.JPG	0	2026-07-01 22:36:40.35471+00
124	48	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945383535_1.JPG	1	2026-07-01 22:36:40.35471+00
125	48	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945385497_2.JPG	2	2026-07-01 22:36:40.35471+00
126	48	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945390823_3.JPG	3	2026-07-01 22:36:40.35471+00
127	48	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945395339_4.JPG	4	2026-07-01 22:36:40.35471+00
128	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945820075_0.JPG	0	2026-07-01 22:43:57.164441+00
129	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945822590_1.JPG	1	2026-07-01 22:43:57.164441+00
130	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945824268_2.JPG	2	2026-07-01 22:43:57.164441+00
131	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945828603_3.JPG	3	2026-07-01 22:43:57.164441+00
132	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945831312_4.JPG	4	2026-07-01 22:43:57.164441+00
133	49	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945833681_5.JPG	5	2026-07-01 22:43:57.164441+00
134	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946181293_0.JPG	0	2026-07-01 22:50:01.462804+00
135	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946183368_1.JPG	1	2026-07-01 22:50:01.462804+00
136	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946184809_2.JPG	2	2026-07-01 22:50:01.462804+00
137	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946188327_3.JPG	3	2026-07-01 22:50:01.462804+00
138	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946191753_4.JPG	4	2026-07-01 22:50:01.462804+00
139	50	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946196109_5.JPG	5	2026-07-01 22:50:01.462804+00
146	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947229277_0.png	0	2026-07-01 23:07:23.457259+00
147	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947237042_1.png	1	2026-07-01 23:07:23.457259+00
148	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947750904_0.png	2	2026-07-01 23:15:52.65547+00
149	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947751801_1.jpg	3	2026-07-01 23:15:52.65547+00
150	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947764330_0.png	4	2026-07-01 23:16:05.76624+00
151	51	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947764804_1.jpg	5	2026-07-01 23:16:05.76624+00
152	52	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/52/1783021267096_0.jpg	0	2026-07-02 19:41:11.869509+00
153	52	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/52/1783021268702_1.jpg	1	2026-07-02 19:41:11.869509+00
154	52	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/52/1783021269779_2.jpg	2	2026-07-02 19:41:11.869509+00
160	54	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/54/1783021637130_0.jpg	0	2026-07-02 19:47:23.055626+00
161	54	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/54/1783021638457_1.jpg	1	2026-07-02 19:47:23.055626+00
162	54	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/54/1783021640395_2.jpg	2	2026-07-02 19:47:23.055626+00
163	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021921722_0.JPG	0	2026-07-02 19:52:43.303819+00
164	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021928119_1.JPG	1	2026-07-02 19:52:43.303819+00
165	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021933781_2.JPG	2	2026-07-02 19:52:43.303819+00
166	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021944484_3.JPG	3	2026-07-02 19:52:43.303819+00
167	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021949682_4.JPG	4	2026-07-02 19:52:43.303819+00
169	55	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021959391_6.JPG	6	2026-07-02 19:52:43.303819+00
170	56	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/56/1783022828111_0.png	0	2026-07-02 20:08:45.803129+00
171	56	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/56/1783022850358_1.png	1	2026-07-02 20:08:45.803129+00
172	56	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/56/1783022875061_2.JPG	2	2026-07-02 20:08:45.803129+00
173	56	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/56/1783022903120_3.JPG	3	2026-07-02 20:08:45.803129+00
174	57	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/57/1783024195519_0.png	0	2026-07-02 20:30:08.674641+00
175	57	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/57/1783024198557_1.jpg	1	2026-07-02 20:30:08.674641+00
176	57	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/57/1783024202520_2.jpg	2	2026-07-02 20:30:08.674641+00
177	58	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/58/1783024380797_0.jpg	0	2026-07-02 20:33:07.028261+00
178	58	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/58/1783024383125_1.jpg	1	2026-07-02 20:33:07.028261+00
179	58	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/58/1783024384319_2.jpg	2	2026-07-02 20:33:07.028261+00
180	59	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/59/1783024504235_0.jpg	0	2026-07-02 20:35:09.155523+00
181	59	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/59/1783024505870_1.jpg	1	2026-07-02 20:35:09.155523+00
182	60	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/60/1783024649114_0.jpg	0	2026-07-02 20:37:33.483119+00
183	60	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/60/1783024650848_1.jpg	1	2026-07-02 20:37:33.483119+00
184	61	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/61/1783024773204_0.jpg	0	2026-07-02 20:39:43.105519+00
185	61	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/61/1783024775691_1.jpg	1	2026-07-02 20:39:43.105519+00
186	61	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/61/1783024778976_2.jpg	2	2026-07-02 20:39:43.105519+00
187	62	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/62/1783024919990_0.jpg	0	2026-07-02 20:42:03.449401+00
188	62	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/62/1783024921109_1.jpg	1	2026-07-02 20:42:03.449401+00
189	63	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/63/1783025261582_0.png	0	2026-07-02 20:47:45.642159+00
190	64	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025451683_0.png	0	2026-07-02 20:51:08.654106+00
191	64	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025455544_1.jpg	1	2026-07-02 20:51:08.654106+00
192	64	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025459514_2.jpg	2	2026-07-02 20:51:08.654106+00
193	64	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025463028_3.jpg	3	2026-07-02 20:51:08.654106+00
194	64	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025467037_4.jpg	4	2026-07-02 20:51:08.654106+00
195	65	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/65/1783026216535_0.png	0	2026-07-02 21:03:40.962347+00
196	65	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/65/1783026219335_1.jpg	1	2026-07-02 21:03:40.962347+00
197	66	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/66/1783084216823_0.JPG	0	2026-07-03 13:10:21.674092+00
198	66	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/66/1783084218498_1.JPG	1	2026-07-03 13:10:21.674092+00
199	67	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/67/1783084552261_0.JPG	0	2026-07-03 13:16:03.795952+00
200	67	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/67/1783084559531_1.JPG	1	2026-07-03 13:16:03.795952+00
201	68	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/68/1783084864760_0.png	0	2026-07-03 13:21:20.951781+00
202	68	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/68/1783084869367_1.JPG	1	2026-07-03 13:21:20.951781+00
203	68	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/68/1783084875607_2.JPG	2	2026-07-03 13:21:20.951781+00
205	69	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085078404_1.JPG	1	2026-07-03 13:24:52.218457+00
206	69	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085080802_2.JPG	2	2026-07-03 13:24:52.218457+00
207	69	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085082731_3.JPG	3	2026-07-03 13:24:52.218457+00
208	69	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085085452_4.JPG	4	2026-07-03 13:24:52.218457+00
209	69	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085088643_5.JPG	5	2026-07-03 13:24:52.218457+00
211	70	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/70/1783085386369_0.JPG	0	2026-07-03 13:29:52.99742+00
212	70	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/70/1783085389126_1.JPG	1	2026-07-03 13:29:52.99742+00
213	71	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/71/1783085818658_0.png	0	2026-07-03 13:37:29.67145+00
214	71	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/71/1783085825960_1.png	1	2026-07-03 13:37:29.67145+00
215	71	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/71/1783085835063_2.JPG	2	2026-07-03 13:37:29.67145+00
216	72	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/72/1783086103270_0.jpg	0	2026-07-03 13:41:50.09155+00
217	72	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/72/1783086105511_1.jpg	1	2026-07-03 13:41:50.09155+00
218	72	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/72/1783086108459_2.jpg	2	2026-07-03 13:41:50.09155+00
219	73	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/73/1783975574466_0.png	0	2026-07-13 20:46:33.933286+00
220	73	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/73/1783975579184_1.JPG	1	2026-07-13 20:46:33.933286+00
221	73	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/73/1783975586297_2.png	2	2026-07-13 20:46:33.933286+00
222	74	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977602554_0.png	0	2026-07-13 21:20:19.938516+00
223	74	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977606543_1.JPG	1	2026-07-13 21:20:19.938516+00
224	74	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977609506_2.JPG	2	2026-07-13 21:20:19.938516+00
225	74	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977612040_3.JPG	3	2026-07-13 21:20:19.938516+00
226	74	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977616212_4.JPG	4	2026-07-13 21:20:19.938516+00
227	75	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/75/1783978852966_0.png	0	2026-07-13 21:41:06.926571+00
228	75	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/75/1783978855944_1.jpg	1	2026-07-13 21:41:06.926571+00
229	75	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/75/1783978861430_2.jpg	2	2026-07-13 21:41:06.926571+00
230	76	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/76/1783979158220_0.png	0	2026-07-13 21:46:15.041056+00
231	76	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/76/1783979163785_1.HEIC	1	2026-07-13 21:46:15.041056+00
232	76	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/76/1783979168697_2.HEIC	2	2026-07-13 21:46:15.041056+00
233	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134726245_0.png	0	2026-07-15 16:59:00.843039+00
234	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134730972_1.jpeg	1	2026-07-15 16:59:00.843039+00
235	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134735562_2.jpeg	2	2026-07-15 16:59:00.843039+00
236	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134780047_0.png	3	2026-07-15 16:59:49.101323+00
237	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134783296_1.jpeg	4	2026-07-15 16:59:49.101323+00
238	77	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134785922_2.jpeg	5	2026-07-15 16:59:49.101323+00
239	78	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/78/1784135226943_0.png	0	2026-07-15 17:07:20.158898+00
240	78	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/78/1784135232135_1.jpeg	1	2026-07-15 17:07:20.158898+00
241	78	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/78/1784135236063_2.jpeg	2	2026-07-15 17:07:20.158898+00
242	79	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/79/1784135678391_0.png	0	2026-07-15 17:14:45.914158+00
243	79	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/79/1784135680397_1.jpeg	1	2026-07-15 17:14:45.914158+00
244	79	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/79/1784135683276_2.jpeg	2	2026-07-15 17:14:45.914158+00
245	80	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137205713_0.jpeg	0	2026-07-15 17:40:21.749382+00
246	80	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137207155_1.png	1	2026-07-15 17:40:21.749382+00
247	80	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137210618_2.jpeg	2	2026-07-15 17:40:21.749382+00
248	80	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137213082_3.jpeg	3	2026-07-15 17:40:21.749382+00
249	80	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137216444_4.jpeg	4	2026-07-15 17:40:21.749382+00
250	81	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/81/1784140106869_0.jpeg	0	2026-07-15 18:28:40.982843+00
251	81	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/81/1784140108316_1.jpeg	1	2026-07-15 18:28:40.982843+00
252	81	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/81/1784140110081_2.jpeg	2	2026-07-15 18:28:40.982843+00
253	81	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/81/1784140116321_3.jpeg	3	2026-07-15 18:28:40.982843+00
254	82	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/82/1784140577345_0.png	0	2026-07-15 18:36:33.126966+00
255	82	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/82/1784140579978_1.jpeg	1	2026-07-15 18:36:33.126966+00
256	82	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/82/1784140583830_2.jpeg	2	2026-07-15 18:36:33.126966+00
257	82	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/82/1784140587984_3.jpeg	3	2026-07-15 18:36:33.126966+00
262	83	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/83/1784141790358_0.jpg	0	2026-07-15 18:56:35.812418+00
263	83	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/83/1784141791795_1.jpg	1	2026-07-15 18:56:35.812418+00
264	83	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/83/1784141792591_2.jpg	2	2026-07-15 18:56:35.812418+00
265	83	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/83/1784141793791_3.jpg	3	2026-07-15 18:56:35.812418+00
266	84	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/84/1784214937644_0.png	0	2026-07-16 15:15:48.143864+00
267	84	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/84/1784214941318_1.jpeg	1	2026-07-16 15:15:48.143864+00
268	84	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/84/1784214944691_2.jpeg	2	2026-07-16 15:15:48.143864+00
269	85	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/85/1784329898457_0.jpg	0	2026-07-17 23:11:39.852329+00
270	86	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/86/1785618792933_0.jpg	0	2026-08-01 21:13:16.437883+00
271	86	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/86/1785618793960_1.jpg	1	2026-08-01 21:13:16.437883+00
272	86	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/86/1785618794775_2.jpg	2	2026-08-01 21:13:16.437883+00
273	86	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/86/1785618795696_3.jpg	3	2026-08-01 21:13:16.437883+00
274	87	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/87/1785665473238_0.jpg	0	2026-08-02 10:11:15.927329+00
275	87	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/87/1785665474195_1.jpg	1	2026-08-02 10:11:15.927329+00
276	87	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/87/1785665474832_2.jpg	2	2026-08-02 10:11:15.927329+00
277	88	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/88/1785665860901_0.jpg	0	2026-08-02 10:17:43.998411+00
278	88	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/88/1785665862013_1.jpg	1	2026-08-02 10:17:43.998411+00
279	88	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/88/1785665862719_2.jpg	2	2026-08-02 10:17:43.998411+00
280	89	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/89/1785666305093_0.jpg	0	2026-08-02 10:25:08.368314+00
281	89	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/89/1785666306156_1.jpg	1	2026-08-02 10:25:08.368314+00
282	89	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/89/1785666306955_2.jpg	2	2026-08-02 10:25:08.368314+00
283	90	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/90/1785666857762_0.jpg	0	2026-08-02 10:34:21.732892+00
284	90	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/90/1785666858873_1.jpg	1	2026-08-02 10:34:21.732892+00
285	90	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/90/1785666859671_2.jpg	2	2026-08-02 10:34:21.732892+00
286	90	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/90/1785666860318_3.jpg	3	2026-08-02 10:34:21.732892+00
292	16	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/16/1786475172814_1.jpg	3	2026-08-11 19:06:14.403183+00
293	16	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/16/1786475207171_0.jpg	3	2026-08-11 19:06:48.294689+00
294	91	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/91/1786918608921_0.jpg	0	2026-08-16 22:16:52.396909+00
295	91	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/91/1786918610121_1.jpg	1	2026-08-16 22:16:52.396909+00
296	91	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/91/1786918610839_2.jpg	2	2026-08-16 22:16:52.396909+00
297	92	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/92/1787174446585_0.jpg	0	2026-08-19 21:20:50.717112+00
298	92	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/92/1787174447819_1.jpg	1	2026-08-19 21:20:50.717112+00
299	92	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/92/1787174448610_2.jpg	2	2026-08-19 21:20:50.717112+00
300	93	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/93/1787176798565_0.jpg	0	2026-08-19 22:00:01.531666+00
301	93	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/93/1787177936224_0.jpg	1	2026-08-19 22:18:59.832593+00
302	93	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/93/1787177937755_1.jpg	2	2026-08-19 22:18:59.832593+00
303	93	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/93/1787177960111_0.jpg	3	2026-08-19 22:19:22.022162+00
304	94	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/94/1787178244427_0.jpg	0	2026-08-19 22:24:08.756934+00
305	94	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/94/1787178245707_1.jpg	1	2026-08-19 22:24:08.756934+00
306	94	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/94/1787178246670_2.jpg	2	2026-08-19 22:24:08.756934+00
307	95	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/95/1787178487799_0.jpg	0	2026-08-19 22:28:12.258876+00
308	95	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/95/1787178489401_1.jpg	1	2026-08-19 22:28:12.258876+00
309	95	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/95/1787178490366_2.jpg	2	2026-08-19 22:28:12.258876+00
310	96	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/96/1787178928532_0.jpg	0	2026-08-19 22:35:32.73854+00
311	96	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/96/1787178929593_1.jpg	1	2026-08-19 22:35:32.73854+00
312	96	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/96/1787178930719_2.jpg	2	2026-08-19 22:35:32.73854+00
313	97	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/97/1787320344381_0.jpg	0	2026-08-21 13:52:29.214243+00
314	97	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/97/1787320345607_1.jpg	1	2026-08-21 13:52:29.214243+00
315	97	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/97/1787320347143_2.jpg	2	2026-08-21 13:52:29.214243+00
316	98	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320881162_0.jpg	0	2026-08-21 14:01:27.005442+00
317	98	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320882389_1.jpg	1	2026-08-21 14:01:27.005442+00
318	98	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320883411_2.jpg	2	2026-08-21 14:01:27.005442+00
319	98	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320884334_3.jpg	3	2026-08-21 14:01:27.005442+00
320	98	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320885255_4.jpg	4	2026-08-21 14:01:27.005442+00
321	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325417379_0.jpg	0	2026-08-21 15:17:05.849449+00
322	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325418900_1.jpg	1	2026-08-21 15:17:05.849449+00
323	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325420171_2.jpg	2	2026-08-21 15:17:05.849449+00
324	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325421380_3.jpg	3	2026-08-21 15:17:05.849449+00
325	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325422689_4.jpg	4	2026-08-21 15:17:05.849449+00
326	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325423760_5.jpg	5	2026-08-21 15:17:05.849449+00
327	99	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325601049_0.jpg	6	2026-08-21 15:20:08.508905+00
333	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645657230_0.jpg	0	2026-09-05 22:01:01.696257+00
334	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645658183_1.jpg	1	2026-09-05 22:01:01.696257+00
335	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645658900_2.jpg	2	2026-09-05 22:01:01.696257+00
336	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645659540_3.jpg	3	2026-09-05 22:01:01.696257+00
337	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645660427_4.jpg	4	2026-09-05 22:01:01.696257+00
338	100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645696993_0.jpg	5	2026-09-05 22:01:45.389557+00
\.


--
-- Data for Name: book_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.book_options (id, book_id, label, choices, created_at, affects_price) FROM stdin;
4	27	القياس	[{"auto": true, "name": "16/24", "price": 15500}]	2026-07-13 20:03:22.977883+00	t
7	73	القياس	[{"auto": true, "name": "16-24", "price": 4900}]	2026-07-13 20:46:34.681971+00	t
10	75	القياس	[{"auto": true, "name": "16-24", "price": 1900}]	2026-07-13 21:41:07.425557+00	t
11	76	القياس	[{"auto": true, "name": "16-24", "price": 1950}]	2026-07-13 21:46:15.50725+00	t
12	6	القياس	[{"auto": true, "name": "16/24", "price": 3000}]	2026-07-15 13:34:46.74083+00	t
16	78	القياس	[{"auto": true, "name": "16/24", "price": 2800}]	2026-07-15 17:08:18.964971+00	t
17	79	القياس	[{"auto": true, "name": "16/24", "price": 1900}]	2026-07-15 17:14:46.551071+00	t
21	81	القياس	[{"auto": true, "name": "16/24", "price": 5500}]	2026-07-15 18:28:41.510181+00	t
22	82	القياس	[{"auto": true, "name": "16/24", "price": 6900}]	2026-07-15 18:36:33.678249+00	t
24	80	القياس	[{"auto": true, "name": "16/24", "price": 8900}]	2026-07-16 14:35:27.028666+00	t
25	50	القياس	[{"name": "17-25", "price": 2100}]	2026-07-17 15:39:18.021212+00	t
26	74	القياس	[{"auto": true, "name": "16-24", "price": 2500}]	2026-07-17 15:40:15.69458+00	t
28	19	القياس	[{"auto": true, "name": "16/24", "price": 3500}]	2026-07-17 22:59:30.465045+00	t
29	69	القياس	[{"auto": true, "name": "16/24", "price": 3900}]	2026-07-17 22:59:38.534289+00	t
34	38	القياس	[{"auto": true, "name": "16/24", "price": 16900}]	2026-07-17 23:20:00.514625+00	t
35	85	القياس	[{"auto": true, "name": "16-24", "price": 30000}]	2026-07-18 22:15:22.815057+00	t
36	86	القياس	[{"auto": true, "name": "17-24", "price": 3600}]	2026-08-01 21:13:17.032993+00	t
38	88	القياس	[{"auto": true, "name": "16/24", "price": 3000}]	2026-08-02 10:17:44.367956+00	t
39	87	القياس	[{"auto": true, "name": "16/24", "price": 3200}]	2026-08-02 10:18:35.413553+00	t
40	89	القياس	[{"auto": true, "name": "16/24", "price": 3200}]	2026-08-02 10:25:08.783744+00	t
42	90	القياس	[{"auto": true, "name": "16/24", "price": 4900}]	2026-08-02 10:53:33.146202+00	t
44	15	القياس	[{"auto": true, "name": "16/24", "price": 2900}]	2026-08-04 04:31:00.68965+00	t
48	16	القياس	[{"auto": true, "name": "16/24", "price": 21000}]	2026-08-11 19:06:48.680652+00	t
50	77	القياس	[{"auto": true, "name": "16/24", "price": 2990}]	2026-08-15 06:27:33.686637+00	t
51	91	القياس	[{"auto": true, "name": "16-24", "price": 2500}]	2026-08-16 22:16:53.084756+00	t
52	92	القياس	[{"auto": true, "name": "16/24", "price": 3900}]	2026-08-19 21:20:51.548971+00	t
55	93	القياس	[{"auto": true, "name": "16-24", "price": 4300}]	2026-08-19 22:19:22.428285+00	t
57	95	القياس	[{"auto": true, "name": "16-24", "price": 3700}]	2026-08-19 22:28:12.863739+00	t
58	94	القياس	[{"auto": true, "name": "16-24", "price": 3650}]	2026-08-19 22:28:53.134725+00	t
59	96	القياس	[{"auto": true, "name": "16-24", "price": 4500}]	2026-08-19 22:35:33.323456+00	t
60	97	القياس	[{"auto": true, "name": "16_24", "price": 4800}]	2026-08-21 13:52:30.0077+00	t
61	98	القياس	[{"auto": true, "name": "16_24", "price": 8900}]	2026-08-21 14:01:27.776417+00	t
64	99	القياس	[{"auto": true, "name": "16_24", "price": 15000}]	2026-08-21 15:25:19.511486+00	t
68	100	القياس	[{"auto": true, "name": "16/24", "price": 32000}]	2026-09-06 15:12:50.108368+00	t
\.


--
-- Data for Name: books; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.books (id, title, author, price, promotion, image_url, category, categories, rating, pages, publisher, qias, description, "paperType", tahqiq, bestseller, free_delivery, stock, created_at, wholesale_available) FROM stdin;
5	كتاب الرسالة	أبو محمد عبد الله بن أبي زيد القيرواني	2500	2200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/5/1782332299610_0.JPG	دار ابن حزم	{"دار ابن حزم","الخزانة الجزائرية للتراث","دار المحسن","فقه مالكي","ابن أبي زيد القيرواني"}	0	303	دار ابن حزم - دار المحسن	16/24	طبعة فاخرة أول مختصر فقهي مالكي، تتضمن فيه مؤلفًا أكثر من أربعة أفكار فقهية بأربعة آلاف حديث ما بين الراحة والوقوف . يُخرج عبارات مميزة، مع ضبط كامل واضح، وتقسيم مدروس  للنص، وتمييز للرؤوس السوداء\n	شاموا	الخزانة الجزائرية للتراث	t	f	0	2026-06-24 20:18:14.976955+00	f
17	الإكسير لابن القيم الجوزية	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن القيم الجوزية (691 - 751ه)	1800	1500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/17/1782494715470_0.jpg	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية",التزكية}	0	320	دار الحضارة للنشر والتوزيع - دار النهار	14/20	 خلاصة أعمال القلوب من مدارج السالكين ,كتاب "الإكسير" هو أحد مؤلفات العلامة ابن القيم الجوزية، وهو يتناول موضوعًا من المواضيع الروحية والعلاجية العميقة. وقد عُرف هذا الكتاب بلغة بليغة وتحليل عميق للمسائل المتعلقة بالعلاج الروحي والتداوي من الأمراض النفسية والروحانية.	كريمي اببيض		f	f	0	2026-06-26 17:25:15.379899+00	f
6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة) 	أبي الوليد محمد بن أحمد ابن رشد الجد	3000	2850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/6/1782333004397_0.JPG	دار ابن حزم	{"دار ابن حزم","دار المحسن","الخزانة الجزائرية للتراث","فقه مالكي"}	0	345	دار ابن حزم - دار المحسن	16/24		شاموا	الخزانة الجزائرية للتراث	t	f	9	2026-06-24 20:29:59.655863+00	f
10	كتاب الداء والدواء لابن القيم الجوزية	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن القيم الجوزية (691 - 751ه)	2200	1850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/10/1782491088291_0.JPG	دار ابن حزم	{"دار ابن حزم",التزكية,"كتب ابن القيم الجوزية"}	0	280	دار ابن حزم	16/24	اكتشف العلاج الروحي والنفسي في كتاب "الداء والدواء" من تأليف العلامة ابن القيم الجوزية، أحد أبرز علماء الإسلام. هذا الكتاب الهام يسلط الضوء على الأمراض النفسية والروحية التي تؤثر على الإنسان، ويقدم حلولًا وعلاجات مستوحاة من القرآن الكريم والسنة النبوية.	شاموا 		t	f	21	2026-06-26 16:24:43.703556+00	f
15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك	شيخ المالكية شهاب الدين عبد الرحمن بن محمد ابن عسكر البغدادي المالكي (644ه - 732ه)	2900	2850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/15/1782494001223_0.JPG	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","القدس للكتاب","فقه مالكي"}	0	385	دار ابن حزم - القدس للكتاب	16/24	هذا الكتاب من أهم المختصرات الفقهية على مذهب السادة المالكية التي تناولت الفروع الفقهية في العبادات والمعاملات على طريقة المدرسة المالكية البغدادية	شاموا	عبد الله بن أزهر سنيقرة	f	f	19	2026-06-26 17:13:21.073541+00	f
12	النفحة الرندية في شرح التحفة الوردية (منظومة ابن الوردي في النحو)	محمد بن أب بن أحمد بن عثمان المزمري الجزائري (ت 1160 ه	1800	1400	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/12/1782492295351_0.jpg	دار ابن حزم	{"دار ابن حزم","دار المحسن","الخزانة الجزائرية للتراث","اللغة والبلاغة"}	0	190	دار ابن حزم - دار المحسن	16/24	كتاب النحو في اللغة العربية و هذا الكتاب شرح لطيف على المنظومة النحوية للعلامة عمر بن مظفر ابن الوردي - رحمه الله - يطبع أول مرة محققا على ما يسر الله الوقوف عليه من نسخ خطيةوهو شرح مختصر شامل لأبواب النحو المحتاج إليها , وضم أبوابا و فصولا لا تحويها عادة المختصرات كباب العدد والنسب وغيرها , فيلجأ الطالب الى طرق أبواب المطولات , مع مايسميها التعقيد والإطناب	شاموا	الخزانة الجزائرية للتراث	f	f	20	2026-06-26 16:44:50.857308+00	f
14	(9-1)جامع المسائل لشيخ الإسام ابن تيمية	شيخ الإسلام أحمد بن عبد الحليم بن عبد السلام ابن تيمية (661 - 728ه	17500	17000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/14/1782493124750_0.jpg	دار ابن حزم	{"دار ابن حزم","كتب شيخ الإسلام ابن تيمية",فتاوى}	0	9 مجلدات  - 450 صفحة في كل مجلد تقريبا	دار ابن حزم - دار عطاءات العلم	16/24	طبعة فاخرة هذا الكتاب مجموعة من رسائل شيخ الإسلام ابن تيمية وفتاواه ومسائله التي لم تنشر من قبل	شاموا		f	f	0	2026-06-26 16:58:40.207864+00	f
11	كتاب الداء والدواء لابن القيم الجوزية (محقق)	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن القيم الجوزية (691 - 751ه)	3900	3400	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/11/1782491653331_0.JPG	التزكية	{التزكية,"كتب ابن القيم الجوزية"}	0	784	دار المنهج	16/24		شاموا	د/أسامة بن عطايا بن عثمان العتيبي	f	f	9	2026-06-26 16:34:08.732689+00	f
13	(2-1)شرح قطر الندى وبل الصدى	أبي محمد عبد الله جمال الدين بن هشام الأنصاري (ت 761 رحمه الله	4800	4450	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/13/1782492522841_0.jpg	اللغة والبلاغة	{"اللغة والبلاغة","دار الاثار"}	0	 مجلدين 550 صفحة تقريبا في كل مجلد مجلدين 550 صفحة تقريبا في كل مجلد	دار الاثار	16/24	كتاب يجمع علم النحو في اللغة العربية بشكل مفصل	شاموا	أبي بلال الحضرمي - خالد بن عبود باعامر	f	f	10	2026-06-26 16:48:38.335148+00	f
35	صيد الخاطر (كرتونية)	الإمام أبي الفرج عبد الرحمن بن الجوزي البغدادي المتوفى سنة 597 ه	1500	1200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/35/1782593095503_0.jpg	\N	{}	0	360	دار الإمام مالك	16/24	صيد الخاطر هو كتاب وعظ وإرشاد صدرت عن تجارب عالم بالشريعة , فهي مفيدة في بابها , تنير الطريق أمام المسلم , خاصة العلم والتجربة , في أبواب شتى , وموضوعات مختلفة , مثل الزهد والرقائق والعناية بالعلم الشرعي	شاموا		t	f	1	2026-06-27 20:44:55.507096+00	f
18	(2-1)شفاء العليل في مسائل القضاء والقدر والحكمة والتعليل	 الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن قيم الجوزية (691 - 751)	7500	6800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/18/1782495442350_0.jpg	دار ابن حزم	{"دار ابن حزم","دار عطاءات العلم","كتب ابن القيم الجوزية"}	0	مجلدين 1100 صفحة تقريبا في كليهما	دار ابن حزم -    دار عطاءات العلم	16/24	طبعة فاخرة هذا الكتاب من أوسع المصنفات في موضوع المؤلف إن لم يكن أوسعها وأغزرها مادة , وأجمعها موردا  ,وأكثرها نفعا , ليصبح مرجعا أصيلا لا غنى عنه للباحثين , ويكون شفاء للعليل ورواء للغليل وبلاغا لأهل السنة والدليل , وفي كل خير 	شاموا	بكر ابو  زيد رحمه  الله	f	f	0	2026-06-26 17:37:22.238158+00	f
19	إخبار الأحياء بأخبار الإحياء	زين الدين عبد الرحيم بن الحسين العراقي (725ه - 806ه	3500	3200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/19/1782495797098_0.jpg	علوم الحديث	{"علوم الحديث","الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن"}	0	550	دار ابن حزم - دار المحسن	16/24	هذه قطع صغيرة من أسفار جليلة , حمعت تطبيقات عملية في علم مصطلح الحديث , تخريجا وتفريعا , وترجيحا وتجريحا , ونقدا وتوثيقا كتبها إمام في هذا الفن تقعيدا وتأصيلا	شاموا	الخزانة الجزائرية للتراث	f	f	42	2026-06-26 17:43:17.047649+00	f
20	الجواب الصحيح لمن بدل دين المسيح(1-5) (عطاءات العلم)	شيخ الإسلام أحمد بن عبد الحليم بن عبد اسلام ابن تيمية (661 - 728 ه)	13000	11000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/20/1782496308391_0.jpg	كتب شيخ الإسلام ابن تيمية	{"كتب شيخ الإسلام ابن تيمية","دار ابن حزم"}	0	5 مجلدات 500 صفحة في كل مجلد تقريبا	دار ابن حزم - مركز التأصيل للدراسات والبحوث		ألف ابن تيمية موسوعته (الجواب الصحيح ) في علم الجدل الديني مع علماء النصرانية , وجرت في أوروبا بعد ابن تيمية بقرنين من الزمان وقائع حركة الإصلاح الديني على يد كل من مارتن لوثر , وكالفن وزونجلي	شاموا		f	f	0	2026-06-26 17:51:48.302267+00	f
25	النشر في القراءات العشر (1-5)	أبي الخير شمس الدين محمد بن محمد بن علي بن يوسف ابن الجزري الدمشقي (751ه - 833ه)	11000	9800		دار ابن حزم	{"دار ابن حزم","دار المحسن","علوم القران"}	0	5 مجلدات (500 -700 صفحة في كل مجلد تقريبا	دار ابن حزم - دار المحسن	16/24	يعتبر كتاب النشر في قراءات العشر من أجمع كتب القراءات وأنفعها , إذ تناول فيه ابن الجزري كل صحيح من طرق وروايات القراءات العشر , ويعتبر هذا الكتاب أيضا زبدة ماألفه ابن الجزري في علم القراءات حيث جمع فيه جميع الموضوعات هذا العلم التي أفردها في مصنفاته الأخرى	شاموا	خالد حسن أبو الجود	f	f	0	2026-06-26 18:13:43.11909+00	f
37	كتاب الصلاة	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	3200	2800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/37/1782593517808_0.jpg	دار عطاءات العلم	{"دار عطاءات العلم","دار ابن حزم","كتب ابن القيم الجوزية"}	0	560	دار ابن حزم - دارعطاءات العلم	16/24	طبعة فاخرة اهتم هذا الكتاب بالتصنيف في شأن الصلاة , وذلك لعظم أمرها وعلو مكانتها في الإسلام , وكبير خطرها فيه , وتنوع أحكامها , وسننها , وأحوالها . و ايضا اهتم أهل العلم فصنفو في حكم تاركها وشروطها وأوقاتها ,وفرائضها وسننها وأذكارها وأسرارها , وحكمها , وفوائدها , وغير ذلك من المباحث;المتعلقة بها	شاموا	عدنان بن صفاخان البخاري على نهج بكر أبو زيد	f	f	0	2026-06-27 20:51:57.789298+00	f
36	كتاب الداء والدواء لابن القيم الجوزية	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	1950	1800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/36/1782593376469_0.jpg	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية"}	0	224	دار العالمية	16/24	طبعة مجلدة منقحة ومخرجة الأحاديث تعتمد في تصحيحات وتضعيفات أحاديثها على أحكام الشيخ محمد ناصر الدين الألباني (رحمه الله)\n	شاموا		f	f	0	2026-06-27 20:49:36.502967+00	f
22	الفواكه الدواني على رسالة ابن أبي زيد القيرواني (1-4)	 أحمد بن غنيم النفراوي المالكي (1044 - 1126ه)	11500	10200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/22/1782496830474_0.jpg	دار ابن حزم	{"دار ابن حزم","فقه مالكي"}	0	4 مجلدات 2350 صفحة تقريبا	دار   ابن  حزم	16/24	ذا الكتاب من أهم كتب الفقه المالكي المعتمدة في المذهب , وهو شرح لرسالة ابن ابي زيد القيرواني وسماه مؤلفه : الفواكه الدواني على رسالة ابن أبي زيد القيرواني	شاموا	رابح زرواتي	f	f	0	2026-06-26 18:00:30.420587+00	f
23	الضوء الباهر في حل ألفاظ روضة الناظر وجنة المناظر	 أبو محمد موفق الدين عبد الله بن أحمد بن محمد بن قدامة المقدسي (ت 620 ه)	5500	4750	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/23/1782497039521_0.jpg	دار ابن حزم	{"دار ابن حزم","أصول  الفقه"}	0	1390	دار ابن حزم	16/24	كتاب في أصول الفقه لطلاب العلم المبتدؤون يتحدث عن أصول الفقه بالتفصيل	شاموا	د/كاملة كواري	f	f	10	2026-06-26 18:03:59.485098+00	f
24	المفيد على الراسالة للطالب المستفيد والراغب المستزيد (1-4)	الشيخ العلامة أبي يعقوب يوسف بن يعقوب الرجراجي الواصلي (ت بعد 722 ه)	12000	10000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/24/1782497420883_0.jpg	دار ابن حزم	{"دار ابن حزم","فقه مالكي"}	0	 4 مجلدات - 2150 صفحة	دار ابن حزم	16/24	كتاب المفيد في الرسالة هو شرح متن رسالة القيروانية في الفقه المالكي , لخص فيه الرجراجي مسائل هذا الفن , فأتى فيه على مسائل أبواب الكتاب المشروح جميعا	أبيض	الحبيب بن أحمد الدرقاوي	f	f	2	2026-06-26 18:10:20.75789+00	f
26	الموافقات للشاطبي	أبي إسحاق إبراهيم بن موسى بن محمد اللخمي الشاطبي (ت 790 ه)	4500	4100		دار ابن حزم	{"دار ابن حزم","أصول  الفقه"}	0	807	دار ابن حزم	16/24	كتاب الموافقات هو كتاب في أصول الفقه مشروحة مع الأحكام وهذه طبعة مفصلة فيه	شاموا		f	f	0	2026-06-26 18:16:16.7814+00	f
28	تحفة المودود بأحكام المولود	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن قيم الجوزية (691 - 751)	3800	2950	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/28/1782504315423_0.jpg	دار عطاءات العلم	{"دار عطاءات العلم","دار ابن حزم","كتب ابن القيم الجوزية"}	0	588	دار ابن حزم - دار عطاءات العلم	16/24	طبعة فاخرة نقدم بين يدي هذه الطبعة دراسة موجزة في فقرتين اثنتين إحداهما تربية الأولاد في الإسلام , وأهم الكتب والمراجع القديمة في أحكام الأولاد , إستكمالا لتلك الفصول النافعة التي كتبها المصنف - رحمه الله - في كتابه هذا , والفقرة الثانية الكتاب نفسه بالتعريف , ومنهج التحقيق\n 	شاموا	عثمان بن جمعة ضميرية باشراف بكر ابو زيد	f	f	10	2026-06-26 20:05:15.459178+00	f
29	تيسير الكريم الرحمن في تفسير الكلام المنان(تفسير السعدي)	العلامة الشيخ عبد الحمن بن ناصر السعدي رحمه الله	2800	2500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/29/1782504534757_0.jpg	دار ابن حزم	{"دار ابن حزم","علوم القران",تفسير}	0	المصحف كاملا	دار ابن حزم	16/24		شاموا		t	f	10	2026-06-26 20:08:55.042508+00	f
27	باقة 5كتب الأفضل مجموعة اثار ابن القيم الجوزية (روضة المحبين ونزهة المشتاقين - كتاب الصلاة - تحفة المورود بأحكام المورود - رفع اليدين في الصلاة - اجتماع الجيوش الإسلامية على حرب المعطلة والجهمية)( 5كتب	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن قيم الجوزية (691 - 751)	15500	13500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/27/1782504037776_0.jpg	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية","دار عطاءات العلم",باقات}	0	5 كتب كل  كتاب حوالي400 صفحة	دار  ابن حزم - دار عطاءات العلم	16/24		شاموا	بكر ابو زيد	f	f	2	2026-06-26 20:00:37.889815+00	f
30	حادي الأرواح إلى بلاد الأفراح (1-2)	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	7500	6800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/30/1782591318167_0.jpg	دار عطاءات العلم	{"دار عطاءات العلم","كتب ابن القيم الجوزية","دار ابن حزم"}	0	 مجلدين 1180 صفحة	دار ابن حزم - دارعطاءات العلم	16/24	هذا الكتاب هو حادي الأرواح إلى بلاد الأفراح لابن القيم الجوزية , ضمنه مؤلفه ما أعده الله لأهل الجنة : من نزل ونعيم وهو كتاب كما قال عنه مؤلفه اسم يطابق مسماه ولفظ يوافق معناه , فهو مثير ساكن العزمات إللى روضات الجنات , وباعث الهمم العليات إلى العيش الهني في تلك الغرفات .	شاموا	زائد بن أحمد النشيري باشراف بكر أبو زيد	f	f	0	2026-06-27 20:15:18.149081+00	f
33	 عشبة شافية 200	عبد الباسط محمد السيد	1800	1000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/33/1782592401588_0.jpg	\N	{}	0	125	دار الاجتهاد	16/24	كتاب 200 عشبة شافية يحتوي على 200 عشبة لتداوي وفوائدها 	أبيض		f	f	0	2026-06-27 20:33:21.583739+00	f
34	صحيح مسلم	 الإمام أبي الحسين مسلم بن الحجاج القشيري النيسابوري (203 - 261ه)	4500	3750	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/34/1782592787649_0.jpg	دار ابن حزم	{"دار ابن حزم","علوم الحديث","الصحيحين والسنن"}	0	1460	دار ابن حزم	16/24	طبعة معتنى بها مرقمة الأ حاديث مع الفهارس , صنف هذا المسند الصحيح من ثلاثمائة ألف حديث مسموعة مسلم بن الحجاج	شاموا		f	f	1	2026-06-27 20:39:47.669312+00	f
31	روضة المحبين ونزهة المشتاقين 	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	4800	4200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/31/1782591698999_0.jpg	دار ابن حزم	{"دار ابن حزم","دار عطاءات العلم","كتب ابن القيم الجوزية"}	0	355	دار ابن حزم - دارعطاءات العلم	16/24	"روضة المحبين" هو كتاب من تأليف العلامة ابن القيم الجوزية، وهو واحد من أهم مؤلفاته في مجال الروحانيات وعلاج القلب والنفس. يتناول الكتاب موضوعًا عميقًا وهو الحب في الإسلام، ويُعد مرجعًا مهمًا لفهم العلاقة الروحية بين العبد وربه من خلال الحب، وكيف يمكن لهذا الحب أن يكون دافعًا للعبادة والطاعة والارتقاء الروحي.	شاموا	محمد عزير شمس	f	f	1	2026-06-27 20:21:38.986919+00	f
39	زاد المعاد في هدي خير العباد 1_2	العلامة أبي عبد الله محمد بن أبي بكر ابن القيم الجوزية -رحمه الله	5800	4900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/39/1782680472666_0.JPG	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية"}	0	مجلدين 1692 صفحة	دار العالمية	16_24	أودع الإمام ابن قيم الجوزية رحمه الله في هذا الكتاب كل نفيس وغال ، فكان فعلاً زاداً للعباد ، افتتح الكتاب بسيرة خير البرية ، ثم أخذ يتناول هديه صلى الله عليه وسلم في الأمور كلها في الطعام والشراب والنكاح والبيع والشراء والمعاملة ، فجمع أحكام العبادات والمعاملات ، فأجاد وأفاد وأبدع فيما ذكر وسطر ، فكان زاداً للمسافر من دار الفناء إلى دار البقاء والمعاد.	شاموا	حلمي بن محمد بن اسماعيل الرشيدي - أبي أنس المصري السلفي	t	f	5	2026-06-28 21:01:12.567883+00	f
40	كتاب الموطأ	 الإمام مالك بن أنس بن مالك رحمه الله	3200	2800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/40/1782684265192_0.JPG	دار العالمية	{"دار العالمية","فقه مالكي"}	0	824	دار العالمية	16_24	طبعة مجلدة برواية يحيى بن يحيى الليثي\nالموطأ هو كتاب حديثي وفقهي من تأليف الإمام مالك بن أنس، مؤسس المذهب المالكي. يُعدُّ أحد أقدم وأشهر كتب الحديث في الإسلام، ويشمل مجموعة من الأحاديث النبوية الشريفة وأقوال الصحابة والتابعين، بالإضافة إلى آراء الإمام مالك في المسائل الفقهية.\nكان هدف الإمام مالك من تأليف الموطأ جمع الأحاديث المتفق عليها بين أهل المدينة، ليتبعها المسلمون في حياتهم اليومية. يضم الكتاب أحاديث تتعلق بالعبادات والمعاملات، كما يعكس منهج الإمام مالك في فقهه الذي يعتمد على الحديث والآراء الفقهية المعتمدة في المدينة.	شاموا	 العلامة محمد فؤاد عبد الباقي	t	f	0	2026-06-28 22:04:25.411584+00	f
41	  فقه الأدعية والأذكار1-2	الشيخ عبد الرزاق بن عبد المحسن البدر	4800	4200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/41/1782684775657_0.png	دار العالمية	{"دار العالمية"}	0	مجلدين	دار العالمية	16_24		شاموا		t	f	0	2026-06-28 22:12:55.628032+00	f
42	كتاب منهاج المسلم لابي بكر الجزائري	أبي بكر جابر الجزائري (رحمه الله)	2700	2250	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/42/1782685056841_0.png	التزكية	{التزكية,"دار العالمية","فقه مالكي"}	0	450	دار العالمية	16_24	هذا الكتاب تكلم فيه المؤلف عن منهج المسلم في حياته من ناحية العقائدية و الاداب والأخلاق والعبادات والعادات وشمل كل الأمور وقال فيه المؤلف انه كتاب المسلم الذي لاينبغي أن يخلو منه بيت كل مسلم	شاموا		t	f	0	2026-06-28 22:17:36.980856+00	f
38	مجموعة اثار شيخ الإسلام ابن تيمية (الرد على الشاذلي - السياسة الشرعية في إصلاح الراعي والرعية -جواب الإعتراضات المصرية -تنبيه الرجل العاقل - الانتصار لاهل الاثر - الرد على السبكي في مسألة تعليق الطلاق (1-2)) 6 كتب	شيخ الإسلام أحمد بن غبد الحليم بن عبد السلام  ابن تيمية (661 - 748ه)	16900	14400	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/38/1782593825490_0.jpg	دار ابن حزم	{"دار ابن حزم","دار عطاءات العلم","كتب شيخ الإسلام ابن تيمية",باقات,فتاوى}	0	الرد على الشاذلي - السياسة الشرعية في إصلاح الراعي والرعية -جواب الإعتراضات المصرية -تنبيه الرجل العاقل - الانتصار لاهل الاثر - الرد على السبكي في مسألة تعليق الطلاق (1-2)) 6 كتب	دار ابن حزم - دارعطاءات العلم	16/24		شاموا	علي محمد عمران	f	f	1	2026-06-27 20:57:05.552667+00	f
43	روضة العقلاء ونزهة الفضلاء	الإمام الحافظ أبي حاتم محمد بن حبان البستي المتوفى سنة 354ه	2800	2250	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/43/1782917509150_0.png	التزكية	{التزكية,"دار العالمية"}	0	340	دار العالمية	16_24	كتاب "روضة العقلاء ونزهة الفضلاء" هو كتاب أدبي من تأليف الإمام ابن حبان، يتناول فيه صفات وفضائل العقلاء والفضلاء بأسلوب أدبي بليغ. يتضمن الكتاب مجموعة من الحكم والمواعظ التي تهدف إلى تهذيب النفس وتوجيهها نحو الفضائل، مع تسليط الضوء على أهمية العقل والحكمة في الحياة اليومية. يعد هذا الكتاب مرجعًا قيمًا في مجاله، حيث يمزج بين الفلسفة الأخلاقية والتوجيهات الدينية، ويقدم نصائح ثمينة تساعد في تحسين سلوك الإنسان وتطوير شخصيته.	شاموا		t	f	10	2026-07-01 14:51:48.878493+00	f
45	تفسير الأحلام لابن سيرين	محمد بن سيرين البصري الأنصاري المتوفى 110 ه	1200	950	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/45/1782943074463_0.png	دار الغد الجديد	{"دار الغد الجديد"}	0	455	دار الغد الجديد	14/20	\nطبعة مفهرسة طبقا للحروف الأبجدية لتسهيل البحث\nهذا الكتاب للعلامة ابن سيرين يجيب علا مئات من التساؤلات في البحث عن تفسير الرؤى والأحلام . بل هو العمدة في هذا المجال على الإطلاق, ويكفي أن مؤلفه هو العلامة ابن سيرين التابعي الجليل\nغير أن أن مايؤخذ على الكتاب هو الصعوبة البحث فيه للوصول إلى بغية ومايحتاج القارئ تفسيره , لذلك كان هذا العمل الذي نقدم فيه ترتيبا كاملا لجميع موضوعات الكتاب على حروف المعجم في خطة غير مسبوقة , على مانعلم ليسهل للقارئ الوصول حاجته في 	طبعة كرتونية ورق أبيض		f	f	5	2026-07-01 21:57:54.340104+00	f
9	حاشية الإمام شرف الدين الطخيخي على مختصرخليل (1-4) التي سماها ((الدرر على بعض مسائل المختصر))	 شرف الدين موسى بن ميمون الطخيخي (ت947ه)	12000	11800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/9/1782488276249_1.jpg	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار المحسن","دار ابن حزم","فقه مالكي"}	0	 4 مجلدات (400-500 صفحة في كل مجلد تقريبا	دار ابن حزم - دار المحسن	16/24	إن المختصر الفقهي للعلامة خليل بن إسحاق الجندي المالكي أشهر ما وضعه المتأخرون , وأحفل ماعني به المتفقهون , إذ جمع بين تحقيق المتقدمين وترجيح المتأخرين فاحتاج العلماء حين رأو كثرة الشروح والحواشي إلى بيان الفاضل المعتمد , وتجلية المفضول المنتقد , وكان من الصنف الأول حاشية الطخيخي 	شاموا	الخزانة الجوائرية للتراث	f	t	9	2026-06-26 15:37:25.896073+00	f
46	تفسير الأحلام لابن سيرين (حجم صغير)	محمد بن سيرين البصري الأنصاري المتوفى 110 ه	900	750	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/46/1782943268381_0.png	دار الغد الجديد	{"دار الغد الجديد"}	0	400	دار الغد الجديد	12/18	طبعة مفهرسة طبقا للحروف الأبجدية لتسهيل البحث\nهذا الكتاب للعلامة ابن سيرين يجيب علا مئات من التساؤلات في البحث عن تفسير الرؤى والأحلام . بل هو العمدة في هذا المجال على الإطلاق, ويكفي أن مؤلفه هو العلامة ابن سيرين التابعي الجليل\nغير أن أن مايؤخذ على الكتاب هو الصعوبة البحث فيه للوصول إلى بغية ومايحتاج القارئ تفسيره , لذلك كان هذا العمل الذي نقدم فيه ترتيبا كاملا لجميع موضوعات الكتاب على حروف المعجم في خطة غير مسبوقة , على مانعلم ليسهل للقارئ الوصول حاجته في يسر وسهولة\n 	طبعة كرتونية ورق أبيض		f	f	2	2026-07-01 22:01:08.041364+00	f
76	ألفية الغريب أرجوزة في غريب القران والوجوه والنظائر القرانية	أبي عبد الله محمد بن امحمد الزجلوي التواتي الجزائري	1950	1900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/76/1783979158220_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن","علوم القران"}	0	170	دار  ابن حزم - دار المحسن	16-24	يمثل الكتاب مرجعًا مهمًا لطلاب علوم القرآن، واللغة العربية، والتفسير، إذ يساعد على فهم التراكيب القرآنية، وبيان أوجه الإعراب، واستخراج الفوائد اللغوية التي تعين على التدبر الصحيح لكتاب الله تعالى.\n\nوقد قام بتحقيق هذه الطبعة ودراستها عبد الله بن عز الدين مسكين، مع العناية بضبط النص، وتوثيق النقول، والتعليق على المواضع التي تحتاج إلى بيان، مما يجعلها طبعة علمية نافعة للباحثين وطلاب العلم.	شاموا	الخزانة الجزائرية للتراث	t	f	9	2026-07-13 21:45:58.502248+00	f
44	فتح الباري شرح صحيح البخاري1/18	أحمد بن علي بن محمد بن محمد بن علي بن أحمد بن حجر الكناني العسقلاني 	35000	32000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/44/1782918453200_0.png	علوم الحديث	{"علوم الحديث","دار العالمية","إبن حجر العسقلاني"}	0	18 مجلد	دار العالمية	16_24	مرجعية علمية كبرى: يُعد من أعلى المراجع في شرح الحديث، خصوصًا “صحيح البخاري”، لما فيه من جمع الروايات وتحقيق الأسانيد وتحليل المتون.\nدقة في الاستنباط الفقهي: الكتاب غنيّ بالاستدلالات الفقهية الدقيقة التي تُظهر عمق فهم النصوص النبوية وربطها بالأحكام الشرعية.\nشمولية علمية: جمع فيه ابن حجر بين علوم عدة: الحديث، الفقه، اللغة، التاريخ، الرجال، والأصول، مما جعله موسوعة علمية متكاملة.\nتصحيح وتنقيح للمفاهيم: فَصَل في كثير من المسائل المختلف فيها وحررها بدقة، مما جعله مرجعًا للفهم الصحيح للنصوص.\nأثره في المدارس العلمية: اعتمدته معظم المدارس الحديثية والمجامع العلمية، ويُدرّس في الأزهر، والجامعة الإسلامية، وغيرهما من المؤسسات العريقة	شاموا		f	t	0	2026-07-01 15:07:32.978268+00	f
47	مصحف رواية ورش عن نافع		1000	950	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/47/1782945158928_0.JPG	مصاحف	{مصاحف}	0	المصحف كاملا	دار ابن الجوزي	14/20		طبعة مصرية ورق شاموا		f	f	0	2026-07-01 22:32:38.885746+00	f
48	مصحف حفص عن عاصم		2500	1900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/48/1782945381575_0.JPG	مصاحف	{مصاحف}	0	المصحف كاملا	بوصلة	14/20		طبعة لبنانية ورق شاموا		t	f	10	2026-07-01 22:36:21.563093+00	f
49	مصحف 17/25 طبعة فاخرة		2200	2000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/49/1782945820075_0.JPG	مصاحف	{مصاحف}	0	المصحف كاملا		17/25		طبعة لبنانية ورق شاموا		t	f	10	2026-07-01 22:43:40.082384+00	f
77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك	 محمد بن محمد بن عبد الله المراكشي(1283 ه - 1369 ه) المشهور بابن الموقت	2990	2950	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/77/1784134726245_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار المحسن","دار ابن حزم","فقه مالكي"}	0	330 	دار ابن حزم - دار المحسن	16/24		شاموا	الخزانة الجزائرية للتراث	f	f	30	2026-07-15 16:58:46.345178+00	f
68	المقدمة العزية للجماعة الأزهرية	أبي الحسن علي بن محمد بن محمد المنوفي المصري	1900	1650	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/68/1783084864760_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن","فقه مالكي"}	0	175	دار ابن حزم - دار المحسن	16/24	مقدمة في العبادات و الأنكحة والبيوع زالفرائض على مذهب الإمام مالك رحمه الله	ورق شاموا	الخزانة الجزائرية للتراث	f	f	49	2026-07-03 13:21:05.286319+00	f
90	صحيح مسلم	أبي الحسين مسلم بن الحجاج القشيري النيسابوري	4900	4600	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/90/1785666857762_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","علوم الحديث"}	0	1010	مكتبة الرشد	16/24		شاموا		f	f	5	2026-08-02 10:34:17.598112+00	f
50	 مصحف (الكعبة) فاخر رواية ورش عن نافع	رواية ورش عن نافع عن طريق الأزرق	1500	1100	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/50/1782946181293_0.JPG	مصاحف	{مصاحف}	0	المصحف كاملا		14/20		 كريمي أبيض		f	f	100	2026-07-01 22:49:41.256102+00	f
51	الحفظ الميسر		3800	3600	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/51/1782947229277_0.png	مصاحف	{مصاحف,"علوم القران"}	0	المصحف كاملا	دار التقوى	17/25	كتاب "الحفظ الميسر" هو كتاب يساعد في تسهيل وتيسير عملية حفظ القرآن الكريم أو أي نصوص دينية أخرى. يتميز الكتاب بأسلوبه البسيط والمنهجي في تنظيم خطوات الحفظ، حيث يركز على توفير استراتيجيات عملية لتنظيم الوقت، وتحفيز الذاكرة، والتعامل مع التحديات التي قد يواجهها الحافظ أثناء العملية.\nيشمل الكتاب تقنيات مختلفة تساعد على تحسين الذاكرة، مثل تقسيم الأجزاء الكبيرة إلى أجزاء صغيرة، والمراجعة المنتظمة، والتكرار، والتركيز على فهم المعاني قبل الحفظ. كما أنه يتناول أهمية الدعاء والاستعانة بالله أثناء هذه الرحلة الروحية والعلمية.\n"الحفظ الميسر" يعتبر مرجعًا مفيدًا لمن يرغب في حفظ القرآن الكريم أو تعلم كيفية الحفظ بطرق عملية وسهلة، ويستهدف الفئات المختلفة من الطلاب والمبتدئين وحتى المحفظين المتمرسين.	ورق شاموا	إعداد : سيد ماضي	t	f	6	2026-07-01 23:07:09.101604+00	f
52	إغاثة اللهفان في مصايد الشيطان	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	7800	6800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/52/1783021267096_0.jpg	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية","دار ابن حزم","دار عطاءات العلم",التزكية}	0	مجلدين 1940  صفحة	دار ابن حزم - دارعطاءات العلم	16/24	طبعة فاخرة , هذا الكتاب من أعظم مؤلفات ابن القيم وأجلها , وهو كتاب نادر في بابه , استقصى فيه المؤلف مصايد الشيطان ومكايده , ومهد لها بأبواب في أمراض القلوب وعلاجها , وكان المؤلف من أطباء القلوب البارعين , واعتمد في الكتاب على نصوص الكتاب والسنة واثار السلف , ومزجها بشيء من الشعر والمواعظ والاداب , ويرشد الناس الى اصلاح عقيدتهم وسلوكهم وتزكية انفسهم.	ورق شاموا	محمد عزير شمس	f	f	0	2026-07-02 19:41:07.844181+00	f
54	الصواعق المرسلة على الجهمية  والمعطلة	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	7800	6800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/54/1783021637130_0.jpg	دار عطاءات العلم	{"دار عطاءات العلم","كتب ابن القيم الجوزية","دار ابن حزم"}	0	مجلدين  1315صفحة	دار ابن حزم - دارعطاءات العلم	16/24	طبعة فاخرة كتاب الصواعق المرسلة أحد أنفس الكتب في الرد على الجهمية والمعطلة , وهو كتاب جليل الشأن , محكم البنيان , هدم فيه الإمام ابن القيم حصونهم من أساسها , وحشد لنقض مذاهبهم أدلة المنقول والمعقول , فلم يبق لهم حجة يتعلقون بها لا منقولا صحيحا ولا معقولا صريحا	ورق شاموا	حسين بن عكاشة بن رمضان	f	f	0	2026-07-02 19:47:18.009523+00	f
55	القران تدبر وعمل		3900	3750	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/55/1783021921722_0.JPG	مصاحف	{مصاحف}	0	القران كاملا				شاموا		t	f	3	2026-07-02 19:52:02.48556+00	f
78	مجموع فيه منظومات علمية لعبد العزيز بن عبد الواحد المغربي المكناسي صاحب (( المورث لمشكل المثلث ))	عبد العزيز بن عبد الواحد بن محمد بن موسى المغربي المكناسي 964 ه	2800	2400	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/78/1784135226943_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار المحسن","دار ابن حزم","أصول  الفقه","علوم القران"}	0	295	دار ابن حزم - دار المحسن	16/24		شاموا	الخزانة الجزائرية للتراث	f	f	50	2026-07-15 17:07:06.960695+00	f
56	المتجر الربيح والمسعى الرجيح والمرحب الفسيح والوجه الصبيح والخلق السميح في شرح الجامع الصحيح (شرح البخاري)	الإمام أبي عبد الله محمد بن أحمد بن محمد بن أحمد ابن مرزوق الحفيد التلمساني المتوفى 842ه	24000	21500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/56/1783022828111_0.png	علوم الحديث	{"علوم الحديث","دار المحسن","الخزانة الجزائرية للتراث","دار ابن حزم"}	0	8 مجلدات	دار ابن حزم - دار المحسن	16/24	شرح الجامع الصحيح (شرح صحيح البخاري)\nمن نفائس المكتبة الإسلامية في علم الحديث الشريف، كتاب موسوعي قيّم للإمام مرزوق الحفيد التلمساني، يتناول شرح أحاديث Sahih al-Bukhari بأسلوب علمي دقيق يجمع بين بيان المعاني، واستنباط الفوائد، وشرح الألفاظ، وإيضاح المسائل الفقهية والعقدية المستفادة من الحديث.\n\nيمتاز هذا العمل بتحقيق علمي متقن، وترتيب منظم يسهّل على طالب العلم والباحث الرجوع إلى المسائل بسهولة، مع عناية خاصة بفوائد الأحاديث والتنبيهات العلمية المهمة.\n\nمميزات الكتاب:\n✔ شرح موسع لأحاديث صحيح البخاري\n✔ بيان الفوائد الحديثية والفقهية والعقدية\n✔ مناسب لطلاب العلم والباحثين والمتخصصين\n✔ طبعة فاخرة متعددة المجلدات بتجليد قوي وجودة عالية\n✔ مرجع مهم في دراسة السنة النبوية وعلوم الحديث	ورق شاموا	أ.د : حفيظة بلميهوب - الخزانة الجزائرية للتراث	f	t	3	2026-07-02 20:07:08.872183+00	f
57	الداء والدواء لابن القيم الجوزية (كرتونية)	الإمام أبي عبد الله محمد بين ابي بكر بن أيوب ابن القيم الجوزية (691- 751)	1500	1050	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/57/1783024195519_0.png	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية"}	0	340	دار التأصيل	16/24	"الداء والدواء" هو كتاب من تأليف العلامة ابن القيم الجوزية، ويتناول فيه موضوعات الطب الروحي وعلاج الأمراض النفسية والروحية من خلال القرآن الكريم والسنة النبوية. يقدم الكتاب حلولًا علاجية للأمراض القلبية والنفسية التي قد تؤثر على الإنسان في حياته اليومية، ويُظهر كيف أن العلاج الروحي يمكن أن يكون له دور كبير في علاج كثير من الأمراض التي لا يمكن علاجها بالطب المادي فقط.	كبعة كرتونية ورق كريمي		t	f	10	2026-07-02 20:29:56.327702+00	f
58	زاد من معاد (خطب جمع في البلد  الأمين)	عبد العزيز بن علي الحربي	2000	1850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/58/1783024380797_0.jpg	دار ابن حزم	{"دار ابن حزم"}	0	558	دار ابن حزم	16/24	الكتاب مجموعة ثالثة من سلسلة الخطب المنبرية , التي ألقاها في مكة المكرمة , بجامع زايدي	ورق شاموا		f	f	1	2026-07-02 20:33:01.555262+00	f
59	شرح الأجرومية	لعلامة محمد بن محمد المعروف ب:نجم الدين الغزي (ت1061ه)	1900	1700	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/59/1783024504235_0.jpg	دار ابن حزم	{"دار ابن حزم","اللغة والبلاغة"}	0	229	دار ابن حزم	16/24	هذا الكتاب في علم النحو واللغة العربية وهو شرح لمتن الأجرومية للعلامة الغزي	ورق شاموا		f	f	0	2026-07-02 20:35:04.864498+00	f
60	شرح الرحبية في علم الفرائض	لإمام عبد الرحمن بن أبي بكر جلال الدين السيوطي (849 - 911ه)	1500	1250	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/60/1783024649114_0.jpg	دار ابن حزم	{"دار ابن حزم","فقه مالكي"}	0	135	دار ابن حزم	16/24	هذا الكتاب هو شرح للمنظومة الرحبية لعلم الفرائض والميراث للسيوطي	ورق شاموا	إياد بن عبد اللطيف بن إبراهيم القيسي	f	f	0	2026-07-02 20:37:29.989909+00	f
79	مسالك الوصول إلى مدارك الأصول	أبي الحسن علي بن عبد الواحد الأنصاري السلجماسي الجزائري توفي 1057ه	1900	1750	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/79/1784135678391_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار المحسن","دار ابن حزم","علوم الحديث","أصول  الفقه"}	0	170	دار ابن حزم - دار المحسن	16/24		شاموا	الخزانة الجزائرية للتراث	f	f	59	2026-07-15 17:14:38.461811+00	f
62	شرح الورقات في أصول الفقه	الإمام جلال الدين محمد بن أحمد المحلي (ت 864 ه)	1700	1500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/62/1783024919990_0.jpg	دار ابن حزم	{"دار ابن حزم"}	0	335 	دار ابن حزم - مكتبة الأمين	16/24	طبعة دراسية منهجية مبتكرة بأسلوب جديد وطريقة معاصرة لشرح الورقات للجويني في أصول الفقه	طبعة كرتونية ورق أبيض		f	f	0	2026-07-02 20:42:00.769782+00	f
64	مصحف (طبعة لبنانية)	مصحف ورش عن نافع	1000	950	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/64/1783025451683_0.png	مصاحف	{مصاحف}	0	المصحف كاملا	دار الأصالة	14/20	طبعة فاخرة	ورق شاموا		t	f	100	2026-07-02 20:50:52.590045+00	f
65	تفسر الطبري (جامع البيان في تأويل اي القران) 1-15	 محمد بن جرير بن يزيد الطبري	30000	29500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/65/1783026216535_0.png	دار ابن حزم	{"دار ابن حزم","علوم القران",تفسير}	0	15 مجلد	دار ابن حزم	16/24	كتاب "تفسير الطبري" هو أحد أروع وأشهر كتب التفسير في التراث الإسلامي، حيث يُعدّ موسوعة علمية ضخمة ومرجعًا أساسيًا في تفسير القرآن الكريم. يُنسب هذا التفسير للإمام محمد بن جرير الطبري، وهو من أعظم العلماء في القرن الثالث الهجري.\nيتميز تفسير الطبري بالعديد من الخصائص التي تجعل منه مصدرًا مهمًا في فهم معاني القرآن الكريم. أولاً، يتميز الإمام الطبري بالاستناد إلى الروايات الصحيحة ويجمع بين التفاسير المأثورة عن الصحابة والتابعين. كما يحرص على توضيح المعاني اللغوية والبلاغية، ويعرض القراءات المختلفة للآيات مع شرح سبب الاختلاف فيها.\nولعلّ أهم ما يميز تفسير الطبري هو منهجيته في الجمع بين التفسير اللغوي، التفسير التاريخي، والتفسير الفقهي، مما يجعله مرجعًا جامعًا لكل طالب علم. كما يقدم الطبري في تفسيره الآراء المختلفة حول المعاني ويعرض الأدلة التي تدعم كل رأي، مما يتيح للقراء فهم أعمق للآيات	ورق شاموا		f	f	0	2026-07-02 21:03:37.406289+00	f
67	قرة العيون على منظومة البيقوني	محمد بن باد بن محمد المختار الكنتي (1314 ه - 1388 ه)	1750	1450	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/67/1783084552261_0.JPG	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن","علوم الحديث"}	0	136	دار ابن حزم - دار المحسن	16/24	يُعد كتاب قرة العيون على منظومة البيقوني من الكتب العلمية المميزة في مصطلح الحديث الشريف، وهو شرح وبيان لمنظومة الإمام البيقوني الشهيرة التي تُعد مدخلًا أساسيًا لطالب علم الحديث.\n\nيتناول الكتاب بأسلوب واضح ومنهجي أهم أنواع الحديث، مثل: الصحيح، الحسن، الضعيف، المسند، المرسل، الموقوف، المتواتر، الآحاد وغيرها من المصطلحات التي يحتاجها كل طالب علم شرعي لفهم قواعد رواية الحديث وضبطها.	ورق شاموا	الخزانة الجزائرية للتراث	f	f	49	2026-07-03 13:15:52.461087+00	f
69	أخبار الخلفاء بني عباس وأيامهم	أبي بكر محمد بن يحيى الصولي	3900	3550	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/69/1783085078404_1.JPG	دار ابن حزم	{"دار ابن حزم","الخزانة الجزائرية للتراث","دار المحسن",التاريخ}	0	560	دار ابن حزم - دار المحسن	16/24	الكتاب منتقى من الاجزاء المفقودة من كتاب الأوراق	ورق شاموا	الخزانة الجزائرية للتراث	f	f	53	2026-07-03 13:24:34.876563+00	f
66	قرة العين بشرح ورقات إمام الحرمين	محمد بن محمدبن عبد الرحمن الحطاب الرعيني المالكي	1800	1550	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/66/1783084216823_0.JPG	أصول  الفقه	{"أصول  الفقه","الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن"}	0	175	دار ابن حزم - دار المحسن	16/24	الكتاب هو لشرح كتاب الورقات للجويني باختصار مناسب للمبتدئين	ورق شاموا	 الخزانة الجزائرية للتراث	t	f	47	2026-07-03 13:10:17.241114+00	f
71	تفسير القران العظيم لابن كثير (1 -4)	إسماعيل بن عمر بن كثير القرشي الدمشقي المعروف بابن كثير	9500	9000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/71/1783085818658_0.png	تفسير	{تفسير,"دار العالمية"}	0	4 مجلدات	دار العالمية للنشر والتوزيع	16/24	🔍 محتوى الكتاب:\nشرح مفصل للآيات القرآنية\nتفسير بلاغي ولغوي مبسط\nتحليل للأحداث التاريخية المتعلقة بالآيات\nتفسير مشترك بين القرآن والسنة النبوية\nأسلوب علمي وسهل الفهم للمبتدئين والمتخصصين\n📚 لماذا يجب أن تقتني هذا الكتاب؟\nمرجع أساسي لفهم معاني القرآن وتفسيره.\nيساعدك في التعمق في الأحكام والقصص القرآني.\nيُعد من أفضل التفاسير التي تجمع بين الجوانب العقائدية والتاريخية.	ورق شاموا	محققة من طرف مجموعة من العلماء	t	f	0	2026-07-03 13:36:59.182122+00	f
70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض	أبي عباس أحمد بن محمد ابن علوان التونسي الشهير بالمصري	5900	5300	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/70/1783085386369_0.JPG	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن","فقه مالكي"}	0	1024	دار ابن حزم - دار المحسن	16/24	يُعد كتاب مختصر ترتيب المدارك وتقريب المسالك من أهم الكتب التي تعرّف بأعلام المذهب المالكي وتوثّق سير كبار علمائه، وهو مختصر لكتاب الإمام القاضي عياض الشهير الذي يُعتبر مرجعًا أساسيًا في تاريخ المدرسة المالكية وتراثها العلمي.\n\nيجمع الكتاب تراجم الأئمة والفقهاء الذين خدموا مذهب الإمام مالك بن أنس، مع عرض لمسيرتهم العلمية، ومؤلفاتهم، ومكانتهم في خدمة الفقه الإسلامي ونشر العلم عبر الأجيال. كما يبرز تطور المذهب المالكي وانتشاره في مختلف الأمصار الإسلامية.	ورق شاموا	الخزانة الجزائرية للتراث	f	f	0	2026-07-03 13:29:46.907774+00	f
72	أحكام أهل الذمة	الإمام أبي عبد الله محمد بن أبي بكر بن أيوب ابن القيم الجوزية (691 - 751ه)	8500	7200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/72/1783086103270_0.jpg	كتب ابن القيم الجوزية	{"كتب ابن القيم الجوزية","دار ابن حزم","دار عطاءات العلم"}	0	مجلدين في كل مجلد 540 صفحة تقريبا	دار ابن حزم - دارعطاءات العلم	16/24	أحكام أهل الذمة من الكتب العلمية الموسوعية القيّمة للإمام ابن قيم الجوزية رحمه الله، تناول فيه الأحكام الشرعية المتعلقة بأهل الذمة من اليهود والنصارى وغيرهم ممن يعيشون في دار الإسلام، مستعرضًا حقوقهم وواجباتهم والعلاقات الشرعية المنظمة للتعامل معهم وفق نصوص القرآن الكريم والسنة النبوية.\n\nيمتاز الكتاب ببحثه العميق وتأصيله الدقيق للمسائل الفقهية، مع عرض أقوال العلماء والأدلة الشرعية والمناقشات العلمية بأسلوب يجمع بين التحقيق والوضوح، مما يجعله مرجعًا مهمًا لطلاب العلم والباحثين في الفقه الإسلامي والسياسة الشرعية.	ورق شاموا	محمد عزير شمس	t	f	1	2026-07-03 13:41:43.696283+00	f
8	 1/5 تنوير المقالة في حل ألفاظ الرسالة	شيخ المالكية شمس الدين محمد بن إبراهيم التتائي المتوفي سنة 942 هـ	16000	15200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/8/1782487653312_0.JPG	دار ابن حزم	{"دار ابن حزم","الخزانة الجزائرية للتراث","فقه مالكي","دار المحسن"}	0	5 مجلدات (450 - 650 صفحة تقريبا في كل مجلد)	دار ابن حزم - دار المحسن	16/24	وهو من الشروح المهمة على رسالة ابن أبي زيد القيرواني\nقال فيه الغزي: (شرح الرسالة شرحا حافلا)، وقال: (شرح على الرسالة عظيم).\nوأما مؤلفه: الشمس التتائي فهو كما وصفه الغزي: (أجمع الناس على جلالته وتحريره لنقول مذهبه).\nيصدر كاملا لأول مرة\n(طبع النصف الأول منه فقط قبل 36 سنة).\nحُقق على أكثر من عشرين نسخة منتقاة، منها نسخ منقولة عن نسخ عليها خط المصنف وأخرى تملكها أئمة فقهاء وكثير منها حوت حواشي وتقييدات وتقريرات مهمة على الكتاب، تمَّ تذييل النص المطبوع بما له منها علاقة مباشرة بالكتاب.\nأما أصحاب الحواشي فهم: عبد الباقي الزرقاني، وابنه محمد، والناصر اللقاني، وأحمد النفراوي، وعلي العمروسي، وأحمد العربي التلمساني، وأحمد البسكري الرماني، وعبد القادر الواطي، والأجهوري والخرشي، وكثير من الحواشي لم يعرف أصحابها.\nيصدر الكتاب في خمسة مجلدات:\nالمجلد الأول: يتضمن مقدمة دراسية شاملة ومتن الرسالة برواية التتائي مستخرج من شرحه ومثبت عليه أقوال التتائي في ضبط النص والتعليق عليه، مع مقدمة حوت منهج إحصائيات دقيقة على الرسالة من خلال كلام التتائي رحمه الله.\nالمجلد الثاني إلى الخامس: الشرح مقسما إلى أرباع حسب تجزئة المصنف.	شاموا	الخزانة الجزائرية للتراث	f	t	37	2026-06-26 15:27:28.694689+00	f
75	أسهل المسالك لنظم ترغيب السالك في الفقه على مذهب الإمام مالك	محمد بن حسن بن علي البشار الرشيدي المالكي المعروف ب :سيدي البشار(ت1161 ه)	1900	1800	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/75/1783978852966_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار المحسن","دار ابن حزم","فقه مالكي"}	0	155	دار  ابن حزم - دار المحسن	16-24		شاموا	الخزانة الجزائرية للتراث	t	f	50	2026-07-13 21:40:53.30022+00	f
81	أحكام القران لابن العربي	أبي بكر محمد بن عبد الله المعروف بابن العربي (468-543(	5500	5200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/81/1784140106869_0.jpeg	دار ابن حزم	{"دار ابن حزم","علوم القران"}	0	1080 القران كامل	دار ابن حزم	16/24		شاموا		f	f	7	2026-07-15 18:28:26.97999+00	f
82	أحكام القران للجصاص	أبي بكر أحمد بن علي الرازي الجصاص	6900	6550	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/82/1784140577345_0.png	دار ابن حزم	{"دار ابن حزم","علوم القران"}	0	1650 القران كاملا	دار ابن حزم	16/24		شاموا		f	f	2	2026-07-15 18:36:17.377786+00	f
84	عدة الصابرين وذخيرة الشاكرين	أبي عبد الله شمس الدين محمد بن أبي بكر الحنبلي الدمشقي المعروف بابن القيم الجوزية	4500	4200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/84/1784214937644_0.png	التزكية	{التزكية,"دار ابن حزم","كتب ابن القيم الجوزية"}	0	860	دار ابن حزم	16/24		شاموا	فواز أحمد زمرلي - عبد الرحمن زمرلي	f	f	25	2026-07-16 15:15:37.53769+00	f
74	المنير في أحكام التجويد	لجنة التلاوة جمعية المحافظة على القران الكريم	2500	2200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/74/1783977602554_0.png	علوم القران	{"علوم القران"}	0	315	جمعية المحافظة على القران الكريم	16-24	لمنير في أحكام التجويد كتاب تعليمي يهدف إلى تبسيط أحكام التجويد وتقديمها بأسلوب واضح ومنظم، مما يجعله مناسبًا للمبتدئين وطلاب حلقات القرآن الكريم، كما يفيد الراغبين في إتقان تلاوة كتاب الله وفق أحكام التجويد.\n\nيعرض الكتاب أهم موضوعات التجويد، بدءًا من مخارج الحروف وصفاتها، مرورًا بأحكام النون الساكنة والتنوين، وأحكام الميم الساكنة، والمدود، وأحكام الوقف والابتداء، مع شرح مبسط وأمثلة تطبيقية من القرآن الكريم تساعد القارئ على الفهم والتطبيق.	أبيض كريمي		t	f	10	2026-07-13 21:20:02.782244+00	f
83	أحكام القران لابن فرس الأندلسي 1-3	أبي محمد عبد المنعم بن عبد الرحيم المعروف (( ابن الفرس الأندلسي)) ت 597ه	7800	6200	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/83/1784141790358_0.jpg	علوم القران	{"علوم القران","دار ابن حزم"}	0	3 مجلدات	دار ابن حزم		من سورة الفاتحة الى سورة الانعام	شاموا	المجلد الاول : طه ابو سريح  المحلد الثاني : منجية السوايحي  المجلد الثالث : صلاح الدين بوعفيف	f	f	2	2026-07-15 18:56:30.307111+00	f
80	تفسير القران العظيم لابن كثير	أبو الفداء إسماعيل بن عمر بن كثير القرشي الدمشقي (المعروف بـ ابن كثير)	8900	8500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/80/1784137205713_0.jpeg	تفسير	{تفسير,"دار ابن حزم","علوم القران"}	0	4 مجلدات ( القران كامل) 	دار ابن حزم	16/24		أبيض		f	f	4	2026-07-15 17:40:05.689462+00	f
61	شرح العمدة	شيخ الإسلام أحمد بن عبد الحليم بن عبد السلام ابن تيمية (661 - 727ه)	17000	16000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/61/1783024773204_0.jpg	كتب شيخ الإسلام ابن تيمية	{"كتب شيخ الإسلام ابن تيمية","دار ابن حزم","دار عطاءات العلم",فتاوى}	0	5 مجلدات (600 -800 صفحة في كل مجلد)	دار ابن حزم - دارعطاءات العلم	16/24	ن كتاب شرح العمدة لشيخ الإسلام ابن تيمية رحمه الله من الكتب الفقهية المهمة , وهو من أهم كتب المذهب الحنبلي , بل هو أوسع كتب المذهب التي وصلت إلينا , وأغناها من حيث تفصيل الروايات و الوجوه	ورق شاموا	 محمد أجمل الإصلاحي	f	f	0	2026-07-02 20:39:34.113767+00	f
87	سنن النسائي	الحافظ أبي عبد الرحمن أحمد بن شعيب ابن علي بن سنان بن دينار النسائي	3200	2850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/87/1785665473238_0.jpg	دار ابن حزم	{"دار ابن حزم","علوم الحديث","الصحيحين والسنن"}	0	920	دار ابن حزم	16/24		شاموا		f	f	4	2026-08-02 10:11:13.102922+00	f
88	سنن أبي داود	الحافظ أبي داود سليمان بن الأشعث السجستاني الأزدي (٢٠٢_٢٧٥)	3000	2600	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/88/1785665860901_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","دار ابن حزم","علوم الحديث"}	0	925	دار ابن حزم	16/24		شاموا		f	f	3	2026-08-02 10:17:40.774944+00	f
89	سنن ابن ماجة	الحافظ أبي عبد الله محمد بن يزيد القزويني ٢٠٩_ ٢٧٣ ه	3200	2850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/89/1785666305093_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","دار ابن حزم","علوم الحديث"}	0	819	دار ابن حزم	16/24		شاموا		f	f	5	2026-08-02 10:25:05.041131+00	f
86	مصحف عربي فرنسي		3600	2850	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/86/1785618792933_0.jpg	مصاحف	{مصاحف}	0		دار القران الكريم	17-24		شاموا		f	f	14	2026-08-01 21:13:12.157526+00	f
16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8	أبي بكر البيهقي (384 - 458ه)	21000	16900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/16/1786475207171_0.jpg	دار الروضة	{"دار الروضة","علوم الحديث"}	0	 8 مجلدات (مابين 550 -700 صفحة في كل مجلد	دار الروضة	16/24	كتاب الخلافيات هو كتاب ضخم جمع فيه بين علمي الحديث و الفقه , وبين فيه علل الحديث , ووجه الجمع بين الأحاديث , حتى قال عنه تاج الدين السبكي في الطبقات وأما كتاب الخلافيات فلم يسبق إلى نوعه , ولم يصنف مثله , وهو طريقة مستقلة حديثية , لا يقدر عليها إلا مبرز في الفقه والحديث	شاموا	فريق البحث العلمي بشركة الروضة	f	t	48	2026-06-26 17:17:20.847358+00	f
91	الرقية الشرعية أصول ومسائل	الدكتور عزيز بن فرحان العنزي	2500	2000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/91/1786918608921_0.jpg	\N	{}	0		مكتبة طالب العلم	16-24		ابيض 	 	f	f	48	2026-08-16 22:16:49.072774+00	f
73	اختصار المبسوطة في اختلاف أصحاب مالك وأقواله	أبو الوليد محمد بن أحمد ابن رشد الجد (ت 520 ه)	4900	4450	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/73/1783975574466_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","دار المحسن","فقه مالكي"}	0	730	دار  ابن حزم - دار المحسن	16-24	يُعد مختصر المبسوطة للإمام أبي الوليد محمد بن أحمد بن رشد الجد (ت 520هـ) من الكتب المهمة في الفقه المالكي، وهو اختصار لكتاب المبسوطة للإمام إسحاق بن إبراهيم التونسي (ت 303هـ)، أحد أبرز علماء المذهب المالكي.\n\nيعرض الكتاب المسائل الفقهية مع بيان اختلاف آراء أصحاب الإمام مالك ورواياتهم، ويُبرز أوجه الاستدلال والترجيح داخل المذهب، مما يجعله مرجعًا مهمًا لفهم تطور الفقه المالكي ومدارسه.\n\nوقد اعتنى بهذه الطبعة الباحث الدكتور يامين بن قدور، فجاءت محققة تحقيقًا علميًا، مع تخريج النصوص وضبطها، لتكون أقرب إلى الأصل وأكثر فائدة للباحثين وطلبة العلم.	شاموا	الخزانة الجزائرية للتراث	f	f	38	2026-07-13 20:46:14.222667+00	f
92	صحيح مسلم	أبي الحسين مسلم بن الحجاج القشيري النيسابوري	3900	3550	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/92/1787174446585_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","علوم الحديث","دار العالمية"}	0	930	دار العالمية	16/24		شاموا		f	f	20	2026-08-19 21:20:46.580245+00	f
93	سنن الترمذي	أبو عيسى محمد بن عيسى بن سَوْرة بن موسى الترمذي، المشهور بـ الإمام الترمذي.	4300	3900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/93/1787177960111_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","علوم الحديث","دار العالمية"}	0	1030	دار العالمية	16-24		شاموا		f	f	30	2026-08-19 21:59:58.961122+00	f
96	سنن النسائي	أبو عبد الرحمن أحمد بن شعيب بن علي بن سنان بن بحر بن دينار النسائي.	4500	4050	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/96/1787178928532_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","دار العالمية","علوم الحديث"}	0	1080	دار العالمية	16-24		شاموا		f	f	35	2026-08-19 22:35:28.65719+00	f
95	سنن أبي داوود	أبو داود سليمان بن الأشعث بن إسحاق بن بشير بن شداد بن عمرو بن عمران الأزدي السِّجِسْتاني.	3700	3300	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/95/1787178487799_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","علوم الحديث","دار العالمية"}	0	860	دار العالمية	16-24		شاموا		f	f	60	2026-08-19 22:28:07.955139+00	f
94	سنن ابن ماجة 	أبو عبد الله محمد بن يزيد بن ماجه الرَّبَعي القَزْويني.	3650	3150	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/94/1787178244427_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","دار العالمية","علوم الحديث"}	0	750	دار العالمية	16-24		شاموا		f	f	40	2026-08-19 22:24:04.530067+00	f
98	صحيح البخاري 1-4	أبو عبد الله محمد بن إسماعيل بن إبراهيم بن المغيرة بن بَرْدِزْبَه الجُعفي البخاري.	8900	8500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/98/1787320881162_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","دار العالمية","علوم الحديث"}	0	4 مجلدات	دار العالمية	16_24		شاموا		f	f	20	2026-08-21 14:01:20.778251+00	f
97	مسند الدارمي	أبو محمد عبد الله بن عبد الرحمن بن الفضل بن بهرام بن عبد الصمد الدارمي التميمي السمرقندي (181هـ – 255هـ).	4800	4500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/97/1787320344381_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن","علوم الحديث","دار العالمية"}	0	1150	دار العالمية	16_24		شاموا		f	f	39	2026-08-21 13:52:24.126196+00	f
99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة)		15000	12900	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/99/1787325417379_0.jpg	الصحيحين والسنن	{"الصحيحين والسنن"}	0	سنن ابي داوود 860 ص - سنن الترمذي 1030 ص - سنن النسائي 1150 ص - سنن ابن ماجة 750 ص	دار العالمية	16_24		شاموا		f	t	16	2026-08-21 15:16:57.630521+00	f
21	الذهب الإبريز في تخريج أحاديث (فتح العزيز) للإمام الرافعي	الإمام العلامة محمد بن جهاد بن عبد الله الزركشي الشافعي (745ه - 794ه)	5800	5250	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/21/1782496539434_0.JPG	دار ابن حزم	{"دار ابن حزم","دار المحسن","علوم الحديث","الخزانة الجزائرية للتراث"}	0	1296	دار ابن حزم - دار المحسن	16/24	يعد «الذهب الإبريز» من أوسع كتب تخريج الأحاديث، وهو من أصول الحافظ ابن حجر العسقلاني في كتابه «التلخيص الحبير»، وقد حفظ في طياته نقولا جليلة من عدة كتب مفقودة، وفاقت مصادر الكتاب على ما صرح به المؤلف 500 مؤلَّفا، ولم يقتصر فيه على التخريج فقط بل تعداه إلى بيان الغريب والاستطراد في بيان المسائل الفقهية الخلافية وغيرها من الفوائد التي صرح بها في منهجه في المقدمة\nالمؤلف : الإمام العلامة محمد بن جهاد بن عبد الله الزركشي	شاموا	الخزانة الجزائرية للتراث	f	f	9	2026-06-26 17:55:39.356276+00	f
85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية	شيخ الإسلام تقي الدين أحمد بن عبد الحليم بن عبد السلام ابن تيمية الحراني	30000	29500	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/85/1784329898457_0.jpg	دار العالمية	{"دار العالمية","كتب شيخ الإسلام ابن تيمية",فتاوى}	0	 17 مجلد(كل مجلد يحوي على جزئين)	دار العالمية	16-24		شاموا	اعتى به محمد نصر ابي جبل	t	t	35	2026-07-17 23:11:38.217793+00	f
63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل))	ضياء الدين أبي المودة خليل بن إسحاق الجندي (776 ه)	4900	4550	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/63/1783025261582_0.png	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","فقه مالكي","دار المحسن"}	0	715	دار ابن حزم - دار المحسن	16/24	تميزت هذه الطبعة بضبط النص وتقسيمه , وتفريغ مسائله وترقيمها , ووضع عناوين جانبية ,وتحديد الأقفاف وأنصافها , وتمييز تعريفات المصنف ومصطلحاته , وغيرها من المزايا ومختصر العلامة خليل بن إسحاق رحمه الله من أكثر المختصرات الفقهية في المذهب المالكي التي حضيت بقبول وشهرة وانتشار في انحاء الغرب الإسلامي , حتى صار العمدة في بابه والمقدم عند طلابه	ورق شاموا	خالد بن عمر بن عمار العلمي الجزائري	t	f	26	2026-07-02 20:47:42.466022+00	f
32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12)	 أبو محمد عبد الله بن أبي زيد القيرواني رحمه الله 	36000	35000	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/32/1782591967729_0.jpg	الخزانة الجزائرية للتراث	{"الخزانة الجزائرية للتراث","دار ابن حزم","فقه مالكي"}	0	 أبو محمد عبد الله بن أبي زيد القيرواني رحمه الله	دار ابن حزم	16/24	أكمل طبعة لشرح متن الرسالة , تعد الرسالة أشهر متن فقهي مالكي , وقيمتها العلمية لا تخفى , فقد عظم شأنها , وحعل , بالنفع والبركة والقبول مكانها , واشتهرت بركاتها اشتهار النهار , وشاعت في جميع الأقطار , وتلقاها الناس بالقبول في سائر الأعصار وظهرت بركتها ويمنها على من تهمم بها من الصغار والكبار 	شاموا	الخزانة الجزائرية للتراث	f	t	11	2026-06-27 20:26:07.705207+00	f
100	سير أعلام النبلاء 1/15	 الإمام شمس الدين محمد بن أحمد بن عثمان الذهبي رحمه الله	32000	29600	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/100/1788645657230_0.jpg	\N	{}	0	13 مجلد	دار إبداع	16/24		شاموا		t	t	142	2026-09-05 22:00:57.149951+00	f
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, image_url, created_at, type) FROM stdin;
19	تفسير	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AA_D9_81_D8_B3_D9_8A_D8_B1_1782944354140.jfif	2026-06-26 20:09:34.22517+00	category
16	علوم الحديث	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_B9_D9_84_D9_88_D9_85_20_D8_A7_D9_84_D8_AD_D8_AF_D9_8A_D8_AB_1782944419475.jfif	2026-06-26 17:39:42.673295+00	category
27	الصحيحين والسنن	\N	2026-07-15 18:44:23.927498+00	category
3	عقيدة	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_B9_D9_82_D9_8A_D8_AF_D8_A9_1782944633913.png	2026-06-18 12:32:05.344744+00	category
5	الخزانة الجزائرية للتراث	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D9_84_D8_AE_D8_B2_D8_A7_D9_86_D8_A9_20_D8_A7_D9_84_D8_AC_D8_B2_D8_A7_D8_A6_D8_B1_D9_8A_D8_A9_20_D9_84_D9_84_D8_AA_D8_B1_D8_A7_D8_AB_1782331984729.jpg	2026-06-24 20:12:42.332727+00	publisher
18	علوم القران	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_B9_D9_84_D9_88_D9_85_20_D8_A7_D9_84_D9_82_D8_B1_D8_A7_D9_86_1782944709702.png	2026-06-26 18:11:40.240351+00	category
4	دار ابن حزم	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D8_A8_D9_86_20_D8_AD_D8_B2_D9_85_1782331989525.png	2026-06-24 20:12:28.883695+00	publisher
13	دار الروضة	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D9_84_D8_B1_D9_88_D8_B6_D8_A9_1782944783695.jfif	2026-06-26 17:14:50.079577+00	publisher
28	فتاوى	\N	2026-07-17 23:18:52.835701+00	category
6	دار المحسن	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D9_84_D9_85_D8_AD_D8_B3_D9_86_1782332009953.jpg	2026-06-24 20:13:20.955576+00	publisher
15	دار عطاءات العلم	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_B9_D8_B7_D8_A7_D8_A1_D8_A7_D8_AA_20_D8_A7_D9_84_D8_B9_D9_84_D9_85_1782498027031.jpg	2026-06-26 17:30:26.472027+00	publisher
14	كتب ابن القيم الجوزية	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D9_83_D8_AA_D8_A8_20_D8_A7_D8_A8_D9_86_20_D8_A7_D9_84_D9_82_D9_8A_D9_85_20_D8_A7_D9_84_D8_AC_D9_88_D8_B2_D9_8A_D8_A9_1782916268129.png	2026-06-26 17:26:30.308618+00	author
7	فقه مالكي	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D9_81_D9_82_D9_87_20_D9_85_D8_A7_D9_84_D9_83_D9_8A_1782916285266.jpg	2026-06-24 20:31:11.056886+00	category
22	إبن حجر العسقلاني	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A5_D8_A8_D9_86_20_D8_AD_D8_AC_D8_B1_20_D8_A7_D9_84_D8_B9_D8_B3_D9_82_D9_84_D8_A7_D9_86_D9_8A_1782946497875.jfif	2026-07-01 22:27:05.672991+00	author
11	كتب شيخ الإسلام ابن تيمية	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D9_83_D8_AA_D8_A8_20_D8_B4_D9_8A_D8_AE_20_D8_A7_D9_84_D8_A5_D8_B3_D9_84_D8_A7_D9_85_20_D8_A7_D8_A8_D9_86_20_D8_AA_D9_8A_D9_85_D9_8A_D8_A9_1782916291091.png	2026-06-26 16:56:17.115057+00	author
21	دار الغد الجديد	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D9_84_D8_BA_D8_AF_20_D8_A7_D9_84_D8_AC_D8_AF_D9_8A_D8_AF_1782943639743.jpg	2026-07-01 21:58:44.089262+00	publisher
12	القدس للكتاب	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D9_84_D9_82_D8_AF_D8_B3_20_D9_84_D9_84_D9_83_D8_AA_D8_A7_D8_A8_1782943809567.jfif	2026-06-26 17:11:06.60789+00	publisher
20	دار العالمية	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D9_84_D8_B9_D8_A7_D9_84_D9_85_D9_8A_D8_A9_1782943856186.jfif	2026-06-28 22:02:27.317068+00	publisher
10	دار الاثار	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_AF_D8_A7_D8_B1_20_D8_A7_D9_84_D8_A7_D8_AB_D8_A7_D8_B1_1782943894472.jfif	2026-06-26 16:49:16.143851+00	publisher
17	أصول  الفقه	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A3_D8_B5_D9_88_D9_84_20_20_D8_A7_D9_84_D9_81_D9_82_D9_87_1782944067828.png	2026-06-26 18:01:58.079428+00	category
8	التزكية	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D9_84_D8_AA_D8_B2_D9_83_D9_8A_D8_A9_1782944242111.jpg	2026-06-26 16:21:40.487038+00	category
9	اللغة والبلاغة	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D9_84_D9_84_D8_BA_D8_A9_20_D9_88_D8_A7_D9_84_D8_A8_D9_84_D8_A7_D8_BA_D8_A9_1782944326181.jfif	2026-06-26 16:43:15.607541+00	category
24	ابن أبي زيد القيرواني	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D8_A8_D9_86_20_D8_A3_D8_A8_D9_8A_20_D8_B2_D9_8A_D8_AF_20_D8_A7_D9_84_D9_82_D9_8A_D8_B1_D9_88_D8_A7_D9_86_D9_8A_1782946598029.jfif	2026-07-01 22:55:17.732128+00	author
23	مصاحف	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D9_85_D8_B5_D8_A7_D8_AD_D9_81_1783086482336.jfif	2026-07-01 22:30:24.010984+00	quran
25	التاريخ	https://bpuwdyfrawoqlaxvjshw.supabase.co/storage/v1/object/public/book-images/categories/_D8_A7_D9_84_D8_AA_D8_A7_D8_B1_D9_8A_D8_AE_1783086757928.jfif	2026-07-03 13:48:41.385686+00	category
26	باقات	\N	2026-07-13 20:00:10.919526+00	category
\.


--
-- Data for Name: delivery_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_settings (id, home_price, dhd_price, updated_at) FROM stdin;
1	800	400	2026-06-18 12:32:05.344744+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, book_id, title, qty, price, selected_options) FROM stdin;
461	128	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
183	73	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
256	88	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
59	46	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
126	62	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
392	118	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
66	47	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
399	119	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
134	63	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
193	75	5	كتاب الرسالة (16/24)	1	2200	{"القياس": "16/24 (+2200 دج)"}
141	64	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
78	49	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
270	89	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
201	76	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
82	50	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
273	90	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
415	122	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
275	91	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
206	77	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
149	66	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
276	91	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
153	67	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
212	79	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
98	53	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
101	54	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
219	80	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
220	81	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
224	82	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
109	56	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
291	92	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
229	83	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
116	59	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
173	70	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
121	60	5	كتاب الرسالة (16/24)	1	2200	{"القياس": "16/24 (+2200 دج)"}
177	72	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
235	85	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
299	94	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
305	95	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
246	86	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
308	96	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
829	213	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
387	117	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
464	129	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
404	120	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
470	130	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
408	121	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
474	131	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
476	132	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
337	105	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
479	133	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
480	134	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
341	106	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
426	123	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
482	135	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
483	136	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
347	107	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
487	137	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
352	108	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
492	138	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
357	109	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
360	110	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
362	111	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
497	139	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
365	112	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
498	141	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
444	124	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
499	140	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
369	113	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
449	125	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
374	114	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
503	142	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
378	115	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
454	126	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
383	116	66	قرة العين بشرح ورقات إمام الحرمين (16/24)	1	1550	{"القياس": "16/24 (+1550 دج)"}
510	143	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
511	145	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
460	127	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
518	144	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
525	146	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
530	147	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
535	148	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
536	149	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
540	150	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
545	151	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
551	152	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
935	236	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
1059	264	91	الرقية الشرعية أصول ومسائل (16-24)	1	2000	{"القياس": "16-24 (+2500 دج)"}
555	153	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
833	214	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
941	237	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
559	154	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
842	217	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
849	219	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
565	155	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
662	181	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
570	156	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
666	182	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
667	183	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
575	157	19	إخبار الأحياء بأخبار الإحياء (16/24)	1	3200	{"القياس": "16/24 (+3500 دج)"}
576	159	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
670	184	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
582	158	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
677	185	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
592	162	86	مصحف عربي فرنسي (17-24)	1	2850	{"القياس": "17-24 (+3600 دج)"}
599	163	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
604	164	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
608	166	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
609	168	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
613	167	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
614	169	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
616	170	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
697	187	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
620	171	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
622	173	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
702	188	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
707	190	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
710	191	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
633	174	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
634	175	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
715	192	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
717	193	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
642	177	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
649	180	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
831	215	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
719	194	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
720	196	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
936	235	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
837	216	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
747	197	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
844	218	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
751	198	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
854	221	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
757	199	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
861	222	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
763	200	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
768	202	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
867	223	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
873	224	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
777	203	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
874	226	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
880	225	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
787	204	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
788	205	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
789	207	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
883	227	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
792	206	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
798	208	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
890	228	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
891	229	16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8 (16/24)	1	16900	{"القياس": "16/24 (+21000 دج)"}
803	209	15	إرشاد السالك إلى أشرف المسالك على مذهب الإمام أبي عبد الله مالك (16/24)	1	2850	{"القياس": "16/24 (+2900 دج)"}
895	230	16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8 (16/24)	1	16900	{"القياس": "16/24 (+21000 دج)"}
807	210	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
899	231	16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8 (16/24)	1	16900	{"القياس": "16/24 (+21000 دج)"}
900	232	16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8 (16/24)	1	16900	{"القياس": "16/24 (+21000 دج)"}
816	211	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
820	212	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
909	233	16	الخلافيات بين الإمامين الشافعي و أبي حنيفة (1-8 (16/24)	1	16900	{"القياس": "16/24 (+21000 دج)"}
914	234	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
1041	258	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1042	260	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1045	259	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
948	239	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
1048	261	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
952	238	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
1054	262	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1058	263	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
960	242	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2550	{"القياس": "16/24 (+2900 دج)"}
962	243	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1064	265	91	الرقية الشرعية أصول ومسائل (16-24)	1	2000	{"القياس": "16-24 (+2500 دج)"}
1066	267	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1068	266	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
970	244	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1069	268	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1071	269	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
974	245	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1075	270	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
979	246	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1080	271	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1082	272	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
1083	272	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
988	247	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1087	273	66	قرة العين بشرح ورقات إمام الحرمين (16/24)	1	1550	{"القياس": "16/24 (+1550 دج)"}
993	248	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
996	249	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1090	274	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
1093	275	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1097	276	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1098	278	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1008	251	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1009	250	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1014	252	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1027	253	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1030	256	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1033	257	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1176	299	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1303	327	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1101	277	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1103	280	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1308	329	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1107	279	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1182	300	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1314	332	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1186	301	67	قرة العيون على منظومة البيقوني (16/24)	1	1450	{"القياس": "16/24 (+1450 دج)"}
1113	281	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1114	282	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1115	283	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1117	284	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1190	302	68	المقدمة العزية للجماعة الأزهرية (16/24)	1	1650	{"القياس": "16/24 (+1650 دج)"}
1194	303	76	ألفية الغريب أرجوزة في غريب القران والوجوه والنظائر القرانية (16-24)	1	1900	{"القياس": "16-24 (+1950 دج)"}
1125	285	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1130	286	70	مختصر ترتيب المدارك وتقريب المسالك لمعرفة أعلام مذهب مالك للقاضي عياض (16/24)	1	5300	{"القياس": "16/24 (+5300 دج)"}
1199	305	97	مسند الدارمي (16_24)	1	4500	{"القياس": "16_24 (+4800 دج)"}
1135	287	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1136	288	91	الرقية الشرعية أصول ومسائل (16-24)	1	2000	{"القياس": "16-24 (+2500 دج)"}
1204	306	79	مسالك الوصول إلى مدارك الأصول (16/24)	1	1750	{"القياس": "16/24 (+1900 دج)"}
1142	289	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1209	308	21	الذهب الإبريز في تخريج أحاديث (فتح العزيز) للإمام الرافعي (16/24)	1	5250	{"القياس": "16/24 (+5250 دج)"}
1145	290	77	سبيل السعادة في معرفة أحكام العبادة على مذهب الإمام مالك (16/24)	1	2950	{"القياس": "16/24 (+2990 دج)"}
1149	291	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
1153	292	73	اختصار المبسوطة في اختلاف أصحاب مالك وأقواله (16-24)	1	4450	{"القياس": "16-24 (+4900 دج)"}
1156	293	69	أخبار الخلفاء بني عباس وأيامهم (16/24)	1	3550	{"القياس": "16/24 (+3900 دج)"}
1160	294	66	قرة العين بشرح ورقات إمام الحرمين (16/24)	1	1550	{"القياس": "16/24 (+1550 دج)"}
1163	295	73	اختصار المبسوطة في اختلاف أصحاب مالك وأقواله (16-24)	1	4450	{"القياس": "16-24 (+4900 دج)"}
1165	296	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1224	309	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1225	310	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1169	297	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1174	298	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1231	311	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1235	312	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1238	313	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1437	355	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1440	354	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1243	315	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1313	331	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
1444	356	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1247	316	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1318	333	6	كتاب  التقييد والتقسيم على مذهب الكتاب (المدونة)  (16/24)	1	2850	{"القياس": "16/24 (+3000 دج)"}
1252	317	63	المختصر في الفتوى بمذهب مالك بن أنس المعروف ب ((مختصر خليل)) (16/24)	1	4550	{"القياس": "16/24 (+4550 دج)"}
1450	357	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1323	335	9	حاشية الإمام شرف الدين الطخيخي على مختصرخليل (1-4) التي سماها ((الدرر على بعض مسائل المختصر)) (16/24)	1	11800	{"القياس": "16/24 (+11800 دج)"}
1258	319	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1262	320	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1265	321	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1270	322	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	2	70000	{"القياس": "16/24 (+35000 دج)"}
1335	336	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1341	337	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1278	323	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1279	323	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1346	338	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1288	324	32	شرح الرسالة لابن أبي زيد القيرواني للقاضي عبد الوهاب (1-12) (16/24)	1	35000	{"القياس": "16/24 (+35000 دج)"}
1351	339	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1293	325	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1295	326	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1358	340	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1363	341	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1365	342	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
1369	343	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1370	344	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1374	345	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1382	346	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1387	347	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1395	348	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
1396	350	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1400	349	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1409	351	8	 1/5 تنوير المقالة في حل ألفاظ الرسالة (16/24)	1	15200	{"القياس": "16/24 (+15200 دج)"}
1413	352	85	مجموعة الفتاوى لشيخ الإسلام ابن تيمية (16-24)	1	29500	{"القياس": "16-24 (+30000 دج)"}
1417	353	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16000	{"القياس": "16_24 (+15000 دج)"}
1451	358	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1455	359	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1456	360	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1460	361	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1461	362	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1465	363	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1466	367	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1468	366	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1467	365	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1469	364	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1471	368	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1477	369	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1483	370	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16000	{"القياس": "16_24 (+15000 دج)"}
1485	371	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	12900	{"القياس": "16_24 (+15000 دج)"}
1491	372	100	سير أعلام النبلاء 1/15 (16/24)	5	148000	{"القياس": "16/24 (+32000 دج)"}
1492	373	10	كتاب الداء والدواء لابن القيم الجوزية (16/24)	1	1850	{"القياس": "16/24 (+1850 دج)"}
1496	374	10	كتاب الداء والدواء لابن القيم الجوزية (16/24)	1	1850	{"القياس": "16/24 (+1850 دج)"}
1500	375	11	كتاب الداء والدواء لابن القيم الجوزية (محقق) (16/24)	1	3400	{"القياس": "16/24 (+3400 دج)"}
1507	376	100	سير أعلام النبلاء 1/15 (16/24)	10	296000	{"القياس": "16/24 (+32000 دج)"}
1508	377	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1513	378	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1520	379	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1524	380	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1529	381	100	سير أعلام النبلاء 1/15 (16/24)	1	29600	{"القياس": "16/24 (+32000 دج)"}
1534	382	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
1539	383	99	السنن الأربعة (أبي داوود - الترمذي - النسائي - ابن ماجة) (16_24)	1	16700	{"القياس": "16_24 (+15000 دج)"}
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, name, phone, wilaya, commune, address, notes, total, delivery_price, status, livraison, abandoned, created_at, book_id, bundle_qty, bundle_label, selected_options, sheet_synced_at) FROM stdin;
85	ORD-000085	مصطفاي نور الدين	0668143084	بجاية	\N	حي بير السلام.	\N	3300	450	Livrée	bureau	f	2026-07-15 09:33:44.784369+00	6	1	\N	\N	\N
60	ORD-000060	زروق المولود 	0564283805	برج بوعريريج	\N	المسجد العتيق بلدية بئر قاصد علي 	\N	2650	450	Livrée	bureau	f	2026-07-14 16:46:14.273994+00	5	1	\N	\N	\N
49	ORD-000049	عمراوي خيرالدين 	0668934998	سوق أهراس	\N	سدراتة شارع السلم 	\N	3600	750	Livrée	domicile	f	2026-07-14 08:47:51.430133+00	6	1	\N	\N	\N
47	ORD-000047	حاب نصرالدين	0661156427	المسيلة	\N	حي طريق بوسعادة	\N	3300	450	Livrée	bureau	f	2026-07-14 06:41:26.258787+00	6	1	\N	\N	\N
92	ORD-000092	الشيخ ايمن بلقاسم 	0774930901	وهران	\N	حي الياسمين رقم 2 بالقرب من العيادة محل بيع الكرانتيكا	\N	3600	750	Attente	domicile	f	2026-07-15 20:16:17.3813+00	6	1	\N	\N	\N
83	ORD-000083	بلقاسم بخوش	0696485208	أم البواقي	\N	عين مليلة	\N	3600	750	Livrée	domicile	f	2026-07-15 08:43:00.511807+00	6	1	\N	\N	\N
50	ORD-000050	محمد حمداوي 	0662641445	سوق أهراس	\N	بلدية الخضارة مسجد عبد الرحمان بن عوف 	\N	3600	750	Non complète	domicile	t	2026-07-14 12:16:04.774249+00	6	1	\N	\N	\N
86	ORD-000086	جمال دباغ 	0698453194	سيدي بلعباس	\N	بلدية تلاغ حي 100مسكن fnposعمارة 2رقم4	\N	3600	750	Livrée	domicile	f	2026-07-15 11:23:27.793087+00	6	1	\N	\N	\N
70	ORD-000070	لخضر لقدي 	0662728893	المسيلة	\N	حي الكادات 557/17	\N	3600	750	Non complète	domicile	t	2026-07-14 22:08:27.707374+00	6	1	\N	\N	\N
62	ORD-000062	محمدعمار	0671527509	سطيف	\N	دائرة العلمة حي شودار	\N	3600	750	Livrée	domicile	t	2026-07-14 18:04:20.087288+00	6	1	\N	\N	\N
90	ORD-000090	فتاح عبد الرحمان 	0663517537	تلمسان	\N	سيدي داود ندرومة	\N	3650	800	Non complète	domicile	t	2026-07-15 18:26:56.814427+00	6	1	\N	\N	\N
75	ORD-000075	محمود 	0794395885	غليزان	\N	دائرة واد ارهيو 	\N	2650	450	Livrée	bureau	f	2026-07-15 01:18:19.949267+00	5	1	\N	\N	\N
76	ORD-000076	محمود 	0794395885	غليزان	\N	دائرة واد ارهيو 	\N	3300	450	Livrée	bureau	f	2026-07-15 01:31:58.896061+00	6	1	\N	\N	\N
77	ORD-000077	عبدالعزيز اولادمرزوق 	0541333567	تمنراست	\N	حي صورو قهوة 	\N	4150	1300	Livrée	domicile	f	2026-07-15 01:38:26.701335+00	6	1	\N	\N	\N
54	ORD-000054	منصوري	067235075	أولاد جلال	\N	سيد خالد حي كركر	\N	3750	900	Non complète	domicile	t	2026-07-14 14:00:41.726306+00	6	1	\N	\N	\N
46	ORD-000046	ابراهيم قرشاوي	0559070284	الجزائر	\N	Lpp 1200 مسكن معالمة زرالدة	\N	3300	450	Pas de réponse	domicile	f	2026-07-14 05:17:24.272071+00	6	1	\N	\N	\N
94	ORD-000094	غنانية 	0542874642	الجزائر	\N	حي الهواء الجميل باش جراح 	\N	3300	450	Envoyé	domicile	f	2026-07-15 22:58:16.717109+00	6	1	\N	\N	\N
53	ORD-000053	اولف محمد 	0675894672	أدرار	\N	دائرة اولف قصبة ميخاف	\N	3950	1100	Livrée	domicile	f	2026-07-14 12:45:38.301555+00	6	1	\N	\N	\N
88	ORD-000088	مناصرية محمد	0661210911	وهران	\N	47شارع سام بوعافية المقري وهران 	\N	3600	750	Livrée	domicile	f	2026-07-15 12:22:58.396984+00	6	1	\N	\N	\N
56	ORD-000056	عبد العزيز خودير 	0673176638	تيبازة	\N	حي 20 اوت دواودة المركزية 	\N	3500	650	Attente	domicile	f	2026-07-14 16:22:30.053151+00	6	1	\N	\N	\N
73	ORD-000073	محمد عابر 	0662731081	الجزائر	\N	شارع بهجة أحمد بيرخادم	\N	3300	450	Attente	domicile	f	2026-07-14 23:21:14.688556+00	6	1	\N	\N	\N
67	ORD-000067	موسى سمومة 	0658530694	الوادي	\N	حي القطب الجامعي 	\N	3800	950	Annulé	domicile	f	2026-07-14 20:03:32.619522+00	6	1	\N	\N	\N
81	ORD-000081	عامر عبدالنور 	0542755973	\N	\N	\N	\N	2850	0	Non complète	domicile	t	2026-07-15 08:39:33.568139+00	6	1	\N	\N	\N
91	ORD-000091	عبد العزيز خودير 	0673176638	تيبازة	\N	حي 20 اوت دواودة المركزية 	\N	3500	650	Attente	domicile	f	2026-07-15 19:53:18.926968+00	6	1	\N	\N	\N
80	ORD-000080	بوليف عمر	0662527864	ورقلة	\N	حي النصر ورقلة	\N	3400	550	Livrée	bureau	f	2026-07-15 06:19:18.810609+00	6	1	\N	\N	\N
89	ORD-000089	Boukaabar.   Belgard	0791386080	معسكر	\N	حي مدبر	\N	3600	750	Livrée	domicile	f	2026-07-15 13:18:41.414191+00	6	1	\N	\N	\N
79	ORD-000079	مولود	0770782712	مستغانم	\N	المسكن الوظيفي مسجد عمرو بن العاص	\N	3300	450	Livrée	bureau	f	2026-07-15 01:56:28.489524+00	6	1	\N	\N	\N
63	ORD-000063	سيد علي لبيب	0796440356	بومرداس	\N	حي الشهيد علي المزاري البساتين دلس	\N	3500	650	Livrée	domicile	f	2026-07-14 18:14:42.858997+00	6	1	\N	\N	\N
64	ORD-000064	كمال زهرة	0554931204	تيبازة	\N	حي بن عزوز القليعة	\N	3500	650	Livrée	domicile	f	2026-07-14 18:30:03.232551+00	6	1	\N	\N	\N
66	ORD-000066	مراد	0782161416	الجزائر	\N	12شارع أحمد غرمول ، سيدي امحمد	\N	3300	450	Livrée	domicile	f	2026-07-14 20:01:23.603223+00	6	1	\N	\N	\N
82	ORD-000082	عامر عبدالنور 	0542755973	البليدة	\N	وسط المدينة 	\N	3150	300	Livrée	bureau	f	2026-07-15 08:39:33.967751+00	6	1	\N	\N	\N
59	ORD-000059	زروق المولود 	0564283805	برج بوعريريج	\N	المسجد العتيق بلدية بئر قاصد علي 	\N	3300	450	Livrée	bureau	f	2026-07-14 16:44:27.650584+00	6	1	\N	\N	\N
72	ORD-000072	عبد الرحيم 	0655661783	تيزي وزو	\N	ذراع بن خدة 	\N	3500	650	Confirmé	domicile	f	2026-07-14 22:50:22.512453+00	6	1	\N	\N	\N
95	ORD-000095	جمال جمال 	0662861206	الجزائر	\N	عين البنيان الجزائر 	\N	3300	450	Attente	domicile	f	2026-07-16 04:15:08.659878+00	6	1	\N	\N	\N
96	ORD-000096	مرين الشارف	0775059140	مستغانم	\N	بلدية الصفصاف مركز	\N	3600	750	Envoyé	domicile	t	2026-07-16 09:25:30.234997+00	6	1	\N	\N	\N
110	ORD-000110	حمزة	0658818731	تبسة	\N	الشريعة	\N	4300	750	Non complète	domicile	t	2026-07-18 00:41:34.431919+00	69	1	\N	\N	\N
113	ORD-000113	\N	0555289197	الجزائر	\N	بلوزداد	\N	3650	450	Non complète	domicile	t	2026-07-18 02:35:57.009593+00	19	1	\N	\N	\N
117	ORD-000117	صالح	0660860996	ورقلة	\N	حاسي مسعود 	\N	4100	550	Attente	bureau	f	2026-07-18 04:16:20.978553+00	69	1	\N	\N	\N
126	ORD-000126	Anes	0551176579	الجزائر	\N	Ouled fayet 	\N	29800	300	Attente	bureau	f	2026-07-18 21:13:50.496503+00	85	1	\N	\N	\N
132	ORD-000132	\N	0776815955	\N	\N	tiziou zou 	\N	3550	0	Non complète	domicile	t	2026-07-19 17:20:05.6238+00	69	1	\N	\N	\N
136	ORD-000136	\N	0670490351	\N	\N	\N	\N	3550	0	Non complète	domicile	t	2026-07-19 19:15:24.609926+00	69	1	\N	\N	\N
115	ORD-000115	عبد الرحمان بوقرنوس 	0774949698	أم البواقي	\N	مسجد الصحابة بلدية ام البواقي 	\N	3650	450	Attente	bureau	f	2026-07-18 04:01:48.918972+00	19	1	\N	\N	\N
122	ORD-000122	الرزمةمحمد 	0659656589	غرداية	\N	ابتدائية قباني محمد حي مرماد غارداية 	\N	4150	950	Attente	domicile	f	2026-07-18 16:14:07.469983+00	19	1	\N	\N	\N
163	ORD-000163	بادة عبد الله 	0662536037	تبسة	\N	الونزة مسجد النور	\N	5300	750	Envoyé	domicile	t	2026-08-03 03:48:52.175854+00	63	1	\N	\N	\N
147	ORD-000147	هشام بن قرينة 	0772018072	الجلفة	\N	بلدية الجلفة حي بربيح 927/12	\N	4000	450	Attente	bureau	f	2026-07-20 15:32:18.929327+00	69	1	\N	\N	\N
116	ORD-000116	عبد الرحمان بوقرنوس 	0774949698	أم البواقي	\N	مسجد الصحابة بلدية ام البواقي 	\N	2000	450	Attente	bureau	f	2026-07-18 04:03:03.776716+00	66	1	\N	\N	\N
105	ORD-000105	ساخي بلقاسم 	0698412744	\N	\N	\N	\N	3550	0	Non complète	domicile	t	2026-07-17 23:06:01.990693+00	69	1	\N	\N	\N
149	ORD-000149	Anes	0551176579	\N	\N	\N	\N	3200	0	Non complète	domicile	t	2026-07-20 22:16:27.493129+00	19	1	\N	\N	\N
106	ORD-000106	ساخي بلقاسم 	0698412744	تندوف	\N	حي موساني 	\N	4300	750	Attente	bureau	f	2026-07-17 23:06:02.021978+00	69	1	\N	\N	\N
118	ORD-000118	موساوي بشير	0656071838	سعيدة	\N	حي الرائد المجدوب	\N	3950	750	Attente	domicile	f	2026-07-18 04:48:35.958992+00	19	1	\N	\N	\N
107	ORD-000107	عمراوي خيرالدين 	0668934998	سوق أهراس	\N	سدراتة شارع السلم 	\N	4300	750	Non complète	domicile	t	2026-07-17 23:47:37.54908+00	69	1	\N	\N	\N
130	ORD-000130	عبدالقادر	0674347219	الجلفة	\N	بلدية عين وسارة 	\N	3650	450	Attente	bureau	f	2026-07-19 13:37:30.687484+00	19	1	\N	\N	\N
124	ORD-000124	عبد المالك بوبزاري	0773623906	جيجل	\N	شارع عبود السعيد حي بن عاشور 	\N	4000	450	Attente	bureau	f	2026-07-18 20:59:20.908857+00	69	1	\N	\N	\N
108	ORD-000108	مراد بن علي 	0540382719	بومرداس	\N	خميس الخشنة 	\N	4200	650	Attente	domicile	f	2026-07-17 23:50:54.465243+00	69	1	\N	\N	\N
131	ORD-000131	Seksaf	0556578885	بسكرة	\N	Biskra	\N	3750	550	Attente	bureau	f	2026-07-19 14:27:19.13268+00	19	1	\N	\N	\N
119	ORD-000119	يوسف بن نافلة	079091010	الشلف	\N	حي بن سونة رقم 2 الشلف	\N	4300	750	Non complète	domicile	t	2026-07-18 06:36:55.593129+00	69	1	\N	\N	\N
109	ORD-000109	دخينيسة حسين 	0697033710	غرداية	\N	بريان 	\N	4100	550	Attente	bureau	f	2026-07-18 00:10:39.22872+00	69	1	\N	\N	\N
111	ORD-000111	بن داني محمد المهدي 	0554071927	\N	\N	\N	\N	3200	0	Non complète	domicile	t	2026-07-18 02:02:04.322121+00	19	1	\N	\N	\N
123	ORD-000123	يوسف بن نافلة 	0790910107	الشلف	\N	حي بن سونة رقم الباب 3الشلف	\N	4300	750	Attente	domicile	f	2026-07-18 18:08:32.276101+00	69	1	\N	\N	\N
112	ORD-000112	بن داني محمد المهدي 	0554071927	مستغانم	\N	حي جبلي محمد 	\N	3650	450	Attente	bureau	f	2026-07-18 02:02:04.322466+00	19	1	\N	\N	\N
120	ORD-000120	العربي	096975684	سعيدة	\N	39شارع العقيد عميروش	\N	3950	750	Non complète	domicile	t	2026-07-18 11:02:31.28166+00	19	1	\N	\N	\N
114	ORD-000114	اخبار الاحياء باخبار الاحياء	0555289197	الجزائر	\N	بلوزداد دار البابور	\N	3650	450	Attente	domicile	f	2026-07-18 02:38:39.559869+00	19	1	\N	\N	\N
125	ORD-000125	ياسين 	0560941000	الجزائر	\N	هراوة 	\N	4000	450	Attente	domicile	f	2026-07-18 21:03:51.526342+00	69	1	\N	\N	\N
167	ORD-000167	سامي معراف	0671008657	توقرت	\N	الزاوية العابدية 	\N	5550	1000	Non complète	domicile	t	2026-08-03 06:15:59.255497+00	63	1	\N	\N	\N
121	ORD-000121	دخينيسة حسين 	0697033710	غرداية	\N	بريان 	\N	4100	550	Attente	bureau	f	2026-07-18 11:53:08.68491+00	69	1	\N	\N	\N
133	ORD-000133	بلبيةقويدر 	0668606162	تيارت	\N	عمارة مسري بجانب لوناب رحوية 	\N	29500	0	Non complète	domicile	t	2026-07-19 17:34:12.637286+00	85	1	\N	\N	\N
134	ORD-000134	\N	0557818454	تبسة	\N	حي تيفاست A13 رقم 3	\N	4300	750	Non complète	domicile	t	2026-07-19 18:07:43.001497+00	69	1	\N	\N	\N
127	ORD-000127	محمود طلحة 	0675429775	الأغواط	\N	الأغواط	\N	4050	500	Attente	bureau	f	2026-07-19 10:53:40.683575+00	69	1	\N	\N	\N
128	ORD-000128	محمد محمد	0550696010	ميلة	\N	\N	\N	29500	0	Non complète	domicile	t	2026-07-19 11:53:51.287158+00	85	1	\N	\N	\N
135	ORD-000135	نبيل بوحفارة	0557818454	تبسة	\N	حي تيفاست A13 رقم 3	\N	4300	750	Non complète	domicile	t	2026-07-19 18:07:43.150849+00	69	1	\N	\N	\N
155	ORD-000155	محمد طه	0665571124	سيدي بلعباس	\N	سيدي بلعباس 22000	\N	4000	450	Non complète	bureau	t	2026-07-21 14:44:10.488641+00	69	1	\N	\N	\N
129	ORD-000129	محمد محمد	0550696010	ميلة	\N	التلاغمة 	\N	29500	0	Attente	domicile	f	2026-07-19 11:53:51.529291+00	85	1	\N	\N	\N
151	ORD-000151	محمد عابر	0662731081	الجزائر	\N	بلدية بيرخادم 	\N	3650	450	Attente	domicile	f	2026-07-20 22:59:06.109561+00	19	1	\N	\N	\N
182	ORD-000182	شريف هاني	0699455545	الجزائر	\N	حيدرة	\N	5000	450	Envoyé	domicile	f	2026-08-03 13:26:08.927371+00	63	1	\N	\N	\N
153	ORD-000153	Tahri	0661711962	وهران	\N	حي بئر الجير 	\N	3650	450	Attente	bureau	f	2026-07-21 02:24:54.711436+00	19	1	\N	\N	\N
158	ORD-000158	ماز نورالدين	0770901863	الجزائر	\N	حي النخيل الدار البيضاء	\N	3850	300	Attente	bureau	f	2026-07-21 19:32:49.602058+00	69	1	\N	\N	\N
157	ORD-000157	حوباي محمد	0671700470	تمنراست	\N	وسط المدينة	\N	3950	750	Attente	bureau	f	2026-07-21 16:47:14.93842+00	19	1	\N	\N	\N
170	ORD-000170	قرقيط محمد	0658856631	البيض	\N	حي أولاد يحي 	\N	5550	1000	Non complète	domicile	t	2026-08-03 06:57:22.944283+00	63	1	\N	\N	\N
168	ORD-000168	سامي معراف	067100	\N	\N	\N	\N	4550	0	Non complète	domicile	t	2026-08-03 06:15:59.255502+00	63	1	\N	\N	\N
173	ORD-000173	وادات	0655273930	\N	\N	\N	\N	4550	0	Non complète	domicile	t	2026-08-03 09:42:48.634475+00	63	1	\N	\N	\N
175	ORD-000175	حجاجي عبد الوهاب	0696863626	\N	\N	\N	\N	4550	0	Non complète	domicile	t	2026-08-03 10:38:03.566397+00	63	1	\N	\N	\N
177	ORD-000177	Ahmed	0674841374	البويرة	\N	\N	\N	5200	650	Non complète	domicile	t	2026-08-03 10:55:09.463544+00	63	1	\N	\N	\N
137	ORD-000137	\N	0670490351	تندوف	\N	حي النهضة  الباب 283	\N	4850	1300	Non complète	domicile	t	2026-07-19 19:15:25.497775+00	69	1	\N	\N	\N
148	ORD-000148	Korchi 	0550445245	الجزائر	\N	Reghaia	\N	4000	450	Attente	domicile	f	2026-07-20 18:50:00.608006+00	69	1	\N	\N	\N
138	ORD-000138	Aimen idressi 	0667595062	باتنة	\N	بلدية اولاعمار ولاية باتنة مسجد التوبة 	\N	29500	0	Attente	domicile	f	2026-07-19 21:53:53.553616+00	85	1	\N	\N	\N
191	ORD-000191	احمد 	0655273930	تمنراست	\N	صورو 	\N	5850	1300	Envoyé	domicile	f	2026-08-03 22:16:54.476896+00	63	1	\N	\N	\N
169	ORD-000169	قرقيط محمد	0658856631	البيض	\N	\N	\N	5550	1000	Non complète	domicile	t	2026-08-03 06:57:22.953882+00	63	1	\N	\N	\N
139	ORD-000139	مريشةموسى 	0661211961	الجزائر	\N	حي عدل 1 عمارة 34 باب الزوار الجزائر 	\N	3500	300	Attente	bureau	f	2026-07-19 23:22:29.114093+00	19	1	\N	\N	\N
140	ORD-000140	بوعلام مبروك 	0663085538	تلمسان	\N	\N	\N	4000	800	Non complète	domicile	t	2026-07-19 23:27:12.631398+00	19	1	\N	\N	\N
141	ORD-000141	بوعلام مبروك 	0663085538	\N	\N	\N	\N	3200	0	Non complète	domicile	t	2026-07-19 23:27:12.632621+00	19	1	\N	\N	\N
150	ORD-000150	Anes	0551176579	الجزائر	\N	Ouled fayet 	\N	3500	300	Attente	bureau	f	2026-07-20 22:16:27.642492+00	19	1	\N	\N	\N
142	ORD-000142	بوعلام مبروك 	0663085538	تلمسان	\N	تبودة_سبدو	\N	4000	800	Attente	domicile	f	2026-07-19 23:27:12.68091+00	19	1	\N	\N	\N
152	ORD-000152	بوروبي شمس الدين 	0555289197	الجزائر	\N	دار البابور	\N	3650	450	Attente	domicile	f	2026-07-20 23:17:52.487398+00	19	1	\N	\N	\N
143	ORD-000143	جلال عبد الرزاق 	0665886284	المسيلة	\N	بلدية الزرزور .السباعية 	\N	4300	750	Attente	domicile	f	2026-07-20 12:03:58.895381+00	69	1	\N	\N	\N
145	ORD-000145	Boulif omar	0662527864	\N	\N	\N	\N	3550	0	Non complète	domicile	t	2026-07-20 13:24:06.900767+00	69	1	\N	\N	\N
154	ORD-000154	بلال	0770224975	برج بوعريريج	\N	اليشير	\N	4300	750	Attente	domicile	f	2026-07-21 14:38:18.437221+00	69	1	\N	\N	\N
144	ORD-000144	Boulif omar	0662527864	ورقلة	\N	Cite ennaceur  ourgla	\N	4100	550	Attente	bureau	f	2026-07-20 13:24:06.909382+00	69	1	\N	\N	\N
188	ORD-000188	علي بن محمود 	0662448364	الجزائر	\N	بلدية العاشور 	\N	5000	450	Envoyé	domicile	f	2026-08-03 17:36:07.422721+00	63	1	\N	\N	\N
174	ORD-000174	قورين محمد 	0662338894	معسكر	\N	تعاونية الامير عبد القادر طريق وهران رقم27	\N	5300	750	Envoyé	domicile	f	2026-08-03 09:56:50.974147+00	63	1	\N	\N	\N
156	ORD-000156	الرزمةمحمد 	0659656589	غرداية	\N	حي مرماد غارداية 	\N	4150	950	Non complète	domicile	t	2026-07-21 15:25:45.116396+00	19	1	\N	\N	\N
159	ORD-000159	\N	0770901863	\N	\N	\N	\N	3550	0	Non complète	domicile	t	2026-07-21 19:32:49.601876+00	69	1	\N	\N	\N
146	ORD-000146	بن عمر	0663274833	معسكر	\N	حي زيدور معسكر	\N	4300	750	Non complète	domicile	t	2026-07-20 14:36:16.930769+00	69	1	\N	\N	\N
164	ORD-000164	جعفر سلامي	0551904822	سطيف	\N	العلمة	\N	5000	450	Envoyé	bureau	f	2026-08-03 04:02:23.589246+00	63	1	\N	\N	\N
181	ORD-000181	الصالح خليفي 	0660765293	باتنة	\N	قرية ثنية السدرة.بلدية  زانة البيضاء	\N	5350	800	Attente	domicile	f	2026-08-03 13:14:57.019333+00	63	1	\N	\N	\N
166	ORD-000166	أبو عبد الرحمن 	0797553759	الجزائر	\N	الرغاية 	\N	4850	300	Envoyé	bureau	f	2026-08-03 05:46:03.402498+00	63	1	\N	\N	\N
180	ORD-000180	جلالي حاج أحمد	0658021110	مستغانم	\N	صيدلية بوخاتم بلدية أولاد بوغالم دائرة عشعاشة	\N	5300	750	Envoyé	domicile	f	2026-08-03 12:00:25.034352+00	63	1	\N	\N	\N
162	ORD-000162	تست	0542285449	بسكرة	\N	Gh	\N	3750	900	Non complète	domicile	t	2026-08-02 19:26:00.002257+00	86	1	\N	\N	\N
183	ORD-000183	محمد امين	0675680858	الشلف	\N	\N	\N	5300	750	Non complète	domicile	t	2026-08-03 13:39:28.905705+00	63	1	\N	\N	\N
171	ORD-000171	محمد	0797744950	مستغانم	\N	الجشم	\N	5000	450	Envoyé	bureau	f	2026-08-03 09:15:15.516854+00	63	1	\N	\N	\N
184	ORD-000184	محمد امين	0675680858	الشلف	\N	شلف	\N	5000	450	Attente	bureau	f	2026-08-03 13:39:29.064894+00	63	1	\N	\N	\N
194	ORD-000194	\N	0554671790	الجزائر	\N	عين النعجة 	\N	3300	450	Non complète	domicile	t	2026-08-04 04:13:09.019093+00	15	1	\N	\N	\N
190	ORD-000190	Arbouche ahmed	0792118076	عين الدفلى	\N	El ataf	\N	5300	750	Envoyé	domicile	f	2026-08-03 21:15:27.249452+00	63	1	\N	\N	\N
196	ORD-000196	الصدبق	0667730695	\N	\N	\N	\N	4550	0	Non complète	domicile	t	2026-08-04 08:52:49.589411+00	63	1	\N	\N	\N
185	ORD-000185	لزهاري عطية 	0665283279	الأغواط	\N	الصورة لو	\N	5050	500	Annulé	bureau	f	2026-08-03 15:29:35.938864+00	63	1	\N	\N	\N
187	ORD-000187	زوبير هواري	0553611963	وهران	\N	حي 75مسكن الأصيلة عمارة ب/أ الطاق 3 الياسمين وهران	\N	5300	750	Envoyé	domicile	t	2026-08-03 17:26:25.802129+00	63	1	\N	\N	\N
198	ORD-000198	أحمد بوعزيز 	0777726647	غليزان	\N	بلدية بني زنطيس 	\N	3600	750	Envoyé	domicile	f	2026-08-04 09:54:51.98722+00	15	1	\N	\N	\N
193	ORD-000193	\N	0550330667	الجلفة	\N	\N	\N	3700	850	Non complète	domicile	t	2026-08-03 23:38:05.089914+00	15	1	\N	\N	\N
192	ORD-000192	انصيرة خزاني	0672598869	الوادي	\N	حاسي خليفة الوادي	\N	5500	950	Envoyé	domicile	f	2026-08-03 23:34:06.109066+00	63	1	\N	\N	\N
197	ORD-000197	أحمد بوعزيز 	0777726647	\N	\N	\N	\N	2850	0	Non complète	domicile	t	2026-08-04 09:54:51.57218+00	15	1	\N	\N	\N
199	ORD-000199	سالم سعيد 	0667941575	ورقلة	\N	مكتب	\N	3400	550	Envoyé	bureau	f	2026-08-04 09:59:31.745824+00	15	1	\N	\N	\N
200	ORD-000200	عبد القادر	0674347219	الجلفة	\N	بلدية عين وسارة حي المقراني	\N	3300	450	Envoyé	bureau	f	2026-08-04 10:57:27.809069+00	15	1	\N	\N	\N
223	ORD-000223	محمد عيسى 	0696543606	تمنراست	\N	ابلسئة	\N	5850	1300	Confirmé	domicile	f	2026-08-05 15:50:23.009223+00	63	1	\N	\N	\N
229	ORD-000229	بن عبد الله العربي 	0770127074	\N	\N	\N	\N	16900	0	Non complète	domicile	t	2026-08-12 10:54:14.324065+00	16	1	\N	\N	\N
211	ORD-000211	زقوم موراد	0697985399	سعيدة	\N	قرية مولاي التوهامي دائرة سيدي بوبكر ولاية سعيدة 	\N	5300	750	Envoyé	domicile	f	2026-08-04 19:41:01.620002+00	63	1	\N	\N	\N
209	ORD-000209	الشيخ مراد 	0556521129	بومرداس	\N	خميس الخشنة 	\N	3500	650	Envoyé	domicile	f	2026-08-04 17:50:04.362501+00	15	1	\N	\N	\N
216	ORD-000216	بن شعاعة عبد العزيز 	0664315946	الجلفة	\N	حي النهضة بلدية القديد17019	\N	3700	850	Envoyé	domicile	t	2026-08-04 23:47:35.50355+00	15	1	\N	\N	\N
217	ORD-000217	احمد حامييد	0696311125	جانت	\N	بررج الحواس 	\N	6450	1900	Attente	domicile	f	2026-08-04 23:49:58.700835+00	63	1	\N	\N	\N
222	ORD-000222	محمد سني 	0550011460	الجزائر	\N	شارع محمد بلوزداد 	\N	3150	300	Envoyé	bureau	f	2026-08-05 13:45:46.356327+00	15	1	\N	\N	\N
203	ORD-000203	عبدالحميد زيداني 	0663873569	باتنة	\N	طريق باتنة بريكة 	\N	5350	800	Non complète	domicile	t	2026-08-04 13:21:47.392539+00	63	1	\N	\N	\N
202	ORD-000202	ياسر 	0665716362	تيميمون	\N	حي 450مسكن تيميمون 	\N	3550	700	Envoyé	bureau	f	2026-08-04 11:02:46.844398+00	15	1	\N	\N	\N
218	ORD-000218	الصادق 	0698829292	الجلفة	\N	\N	\N	3700	850	Non complète	domicile	t	2026-08-05 08:59:02.856795+00	15	1	\N	\N	\N
212	ORD-000212	العربي محمد	772810572	سيدي بلعباس	\N	\N	\N	5300	750	Non complète	domicile	t	2026-08-04 21:53:49.964284+00	63	1	\N	\N	\N
204	ORD-000204	محمد رمول	0556637381	البليدة	\N	حي 500 مسكن خزرونة عمارة 57 رقم06 بني مراد البليدة	\N	5100	550	Attente	domicile	f	2026-08-04 15:07:31.701629+00	63	1	\N	\N	\N
205	ORD-000205	عبد الكريم	0553341940	\N	\N	\N	\N	2850	0	Non complète	domicile	t	2026-08-04 15:41:09.638273+00	15	1	\N	\N	\N
207	ORD-000207	عبد الكريم	055334195	\N	\N	\N	\N	2850	0	Non complète	domicile	t	2026-08-04 15:41:09.697106+00	15	1	\N	\N	\N
219	ORD-000219	محمد طرودي 	0662777093	المنيعة	\N	حاسي القارة الغربية 	\N	5500	950	Attente	domicile	f	2026-08-05 10:16:01.698017+00	63	1	\N	\N	\N
206	ORD-000206	عبد الكريم	0553341940	الجزائر	\N	القبة حي لابروفال	\N	3300	450	Non complète	domicile	t	2026-08-04 15:41:09.638844+00	15	1	\N	\N	\N
210	ORD-000210	قصبة بشير	0660640811	ورقلة	\N	حاسي مسعود	\N	5500	950	Annulé	domicile	t	2026-08-04 18:05:21.942006+00	63	1	\N	\N	\N
213	ORD-000213	ابراهيم بريكي 	0561306161	وهران	\N	رقم12 تعاونية 68 مسكن حي الراءد الشريف يحي بلدية السانية ولاية وهران 	\N	5300	750	Attente	domicile	f	2026-08-04 22:03:42.374552+00	63	1	\N	\N	\N
208	ORD-000208	عزيزي بوعلام 	066550155855855	قسنطينة	\N	\N	\N	5300	750	Non complète	domicile	t	2026-08-04 16:23:34.107313+00	63	1	\N	\N	\N
215	ORD-000215	زكرياء قرمزلي 	0782948209	\N	\N	\N	\N	2850	0	Non complète	domicile	t	2026-08-04 22:22:46.6494+00	15	1	\N	\N	\N
214	ORD-000214	زكرياء قرمزلي 	0782948209	المدية	\N	وادي حربيل المدية	\N	3500	650	Non complète	domicile	t	2026-08-04 22:22:46.635928+00	15	1	\N	\N	\N
227	ORD-000227	مهدي 	0770040404	تبسة	\N	414	\N	3600	750	Non complète	domicile	t	2026-08-05 22:04:34.705497+00	15	1	\N	\N	\N
221	ORD-000221	حمداوي مصطفي 	0667612712	وهران	\N	مسرغين 	\N	5000	450	Attente	bureau	f	2026-08-05 13:16:46.396706+00	63	1	\N	\N	\N
234	ORD-000234	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	3000	450	Attente	bureau	f	2026-08-14 23:13:35.288108+00	77	1	\N	\N	\N
231	ORD-000231	الحاج عبد الله 	0770896684	الجزائر	\N	جنان بن عمر بلدية القبة	\N	16900	0	Envoyé	domicile	f	2026-08-12 11:12:10.172834+00	16	1	\N	\N	\N
230	ORD-000230	بن عبد الله العربي 	0770127074	ميلة	\N	التلاغمة	\N	16900	0	Envoyé	domicile	f	2026-08-12 10:54:14.594539+00	16	1	\N	\N	\N
224	ORD-000224	جيلالي 	+213782502879	تيارت	\N	حي 2000 سكن آي	\N	5300	750	Non complète	domicile	t	2026-08-05 17:18:55.061806+00	63	1	\N	\N	\N
226	ORD-000226	محمد رمول	0556637381	\N	\N	\N	\N	4550	0	Non complète	domicile	t	2026-08-05 20:35:53.817759+00	63	1	\N	\N	\N
228	ORD-000228	براهمي ياسر	0665268079	بني عباس	\N	حي المستقبل رقم 82	\N	5750	1200	Non complète	domicile	t	2026-08-05 23:46:01.358221+00	63	1	\N	\N	\N
225	ORD-000225	محمد رمول	0556637381	البليدة	\N	حي خزرونة بني مراد البليدة	\N	5100	550	Confirmé	domicile	f	2026-08-05 20:35:53.817743+00	63	1	\N	\N	\N
232	ORD-000232	خليفة رزيق	‏‪0676440083‬‏	وهران	\N	\N	\N	16900	0	Non complète	domicile	t	2026-08-13 10:41:50.172443+00	16	1	\N	\N	\N
233	ORD-000233	خليفة رزيق	‏‪00213676440083‬‏	وهران	\N	پدبئر الجير  حي 119	\N	16900	0	Non complète	domicile	t	2026-08-13 10:41:50.308286+00	16	1	\N	\N	\N
236	ORD-000236	محمد بسدات	0671691986	النعامة	\N	العين الصفراء	\N	3550	1000	Attente	domicile	f	2026-08-14 23:21:03.90041+00	77	1	\N	\N	\N
237	ORD-000237	العيد بن بداري 	0673350627	الوادي	\N	الوادي وسط المدينة 	\N	3100	550	Attente	bureau	f	2026-08-15 00:19:53.547964+00	77	1	\N	\N	\N
235	ORD-000235	شالي زكريا	0554039188	الجزائر	\N	كاليتوس حي 108مسكن ع 6رقم 7 شراربة	\N	3000	450	Attente	domicile	f	2026-08-14 23:19:31.350134+00	77	1	\N	\N	\N
238	ORD-000238	رابح باخالد	0661118268	ورقلة	\N	سيدي خويلد	\N	3500	950	Attente	domicile	f	2026-08-15 01:21:25.160859+00	77	1	\N	\N	\N
239	ORD-000239	عمراوي خيرالدين 	0668934998	سوق أهراس	\N	سدراتة شارع السلم 	\N	3300	750	Attente	domicile	f	2026-08-15 02:22:53.361493+00	77	1	\N	\N	\N
242	ORD-000242	Nsim	0662032101	عين صالح	\N	Ksr larab	\N	3700	1150	Attente	domicile	f	2026-08-15 04:46:10.270564+00	77	1	\N	\N	\N
243	ORD-000243	طاهر زريقي	0561574781	غليزان	\N	\N	\N	3700	750	Non complète	domicile	t	2026-08-15 07:04:21.021151+00	77	1	\N	\N	\N
244	ORD-000244	ڨرابيس	0675888289	تيسمسيلت	\N	 حي 76مسكن 	\N	3400	450	Non complète	bureau	t	2026-08-15 08:43:15.027342+00	77	1	\N	\N	\N
336	ORD-000336	زدذوذ مربع بن قويدر	0771526007	عين الدفلى	\N	سونتر فيل	\N	15200	0	Attente	domicile	f	2026-08-28 04:42:51.539809+00	8	1	\N	\N	\N
338	ORD-000338	Anes	0551176579	الجزائر	\N	Ouled fayet 	\N	15200	0	Attente	bureau	f	2026-08-28 13:26:55.223436+00	8	1	\N	\N	\N
245	ORD-000245	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	3400	450	Attente	bureau	f	2026-08-15 08:44:11.077552+00	77	1	\N	\N	\N
284	ORD-000284	عبد الرحمان	0669955128	تمنراست	\N	وسط تمنراست	\N	6600	1300	Non complète	domicile	t	2026-08-17 16:19:10.835912+00	70	1	\N	\N	\N
261	ORD-000261	عبد الكريم 	0553341940	الجزائر	\N	القبة لابروفال	\N	3400	450	Non complète	domicile	t	2026-08-16 17:16:49.858688+00	77	1	\N	\N	\N
246	ORD-000246	منصوري	0672354075	أولاد جلال	\N	سيدي خالد	\N	3850	900	Attente	domicile	f	2026-08-15 09:20:19.912174+00	77	1	\N	\N	\N
274	ORD-000274	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	5000	450	Attente	bureau	f	2026-08-17 11:24:14.47291+00	63	1	\N	\N	\N
270	ORD-000270	عبد الغنى بلكحلة 	0672621441	سكيكدة	\N	داءرة القل   بلدية   الشرايع 	\N	3700	750	Attente	domicile	f	2026-08-17 08:55:22.55291+00	77	1	\N	\N	\N
262	ORD-000262	عبد الغنى بلكحلة 	0672641441	سكيكدة	\N	دائرة القل  بلدية الشرايع   	\N	3700	750	Attente	domicile	f	2026-08-16 18:14:53.4847+00	77	1	\N	\N	\N
253	ORD-000253	منصوري ابو انس	0660052364	عين صالح	\N	بلدية اينغر.ولاية عين صالح	\N	3600	650	Attente	bureau	f	2026-08-15 20:55:58.652351+00	77	1	\N	\N	\N
247	ORD-000247	وسعي احمد	0664935348	المنيعة	\N	حي زويتل	\N	3550	600	Attente	bureau	f	2026-08-15 10:26:43.560234+00	77	1	\N	\N	\N
256	ORD-000256	بوبكر لحمر 	0698488455	قالمة	\N	بوشقوف 	\N	3700	750	Non complète	domicile	t	2026-08-15 21:26:34.536761+00	77	1	\N	\N	\N
248	ORD-000248	بغو عبد المجيد بن السعدي 	0667829151	أم البواقي	\N	مسجد عائشة حي وناس بشير عين ببوش 	\N	3700	750	Attente	domicile	f	2026-08-15 12:24:48.980249+00	77	1	\N	\N	\N
249	ORD-000249	\N	0662472272	\N	\N	\N	\N	2950	0	Non complète	domicile	t	2026-08-15 13:19:22.090492+00	77	1	\N	\N	\N
257	ORD-000257	زين الدين بن محمد 	0674038673	عين صالح	\N	حاسي لحجار	\N	4100	1150	Non complète	domicile	t	2026-08-15 21:42:16.405777+00	77	1	\N	\N	\N
275	ORD-000275	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	5750	450	Attente	bureau	f	2026-08-17 12:00:28.657592+00	70	1	\N	\N	\N
263	ORD-000263	عبد الله 	0671334462	إليزي	\N	برج عمر ادريس 	\N	6550	1250	Attente	domicile	f	2026-08-16 23:23:12.228571+00	70	1	\N	\N	\N
264	ORD-000264	همام سليماني	0779466189	\N	\N	\N	\N	2000	0	Non complète	domicile	t	2026-08-16 23:35:57.788782+00	91	1	\N	\N	\N
271	ORD-000271	عزيز بن محمد لمين 	0676356932	توقرت	\N	سيدي سليمان 	\N	6300	1000	Attente	domicile	f	2026-08-17 11:01:11.972626+00	70	1	\N	\N	\N
251	ORD-000251	علي بن محمود 	0662448364	الجزائر	\N	بلدية العاشور 	\N	3400	450	Non complète	domicile	t	2026-08-15 17:08:23.141611+00	77	1	\N	\N	\N
250	ORD-000250	إسماعيل جدور 	0551506813	تلمسان	\N	الكيفان - حي اللوز -	\N	3450	500	Attente	bureau	f	2026-08-15 17:06:44.768417+00	77	1	\N	\N	\N
258	ORD-000258	محمد دغموم 	0560398573	البويرة	\N	مسجد عمر بن عبد العزيز الاخضرية شارع 17 اكتوبر _ البويرة _	\N	3600	650	Attente	domicile	f	2026-08-16 11:13:12.979726+00	77	1	\N	\N	\N
260	ORD-000260	عبد الكريم 	0553341940	\N	\N	\N	\N	2950	0	Non complète	domicile	t	2026-08-16 16:47:28.721431+00	77	1	\N	\N	\N
252	ORD-000252	علي بن محمود 	0662448364	الجزائر	\N	العاشور 	\N	3400	450	Attente	domicile	f	2026-08-15 18:11:36.243579+00	77	1	\N	\N	\N
259	ORD-000259	عبد الكريم 	0553341940	الجزائر	\N	القبة لابروفال	\N	3400	450	Non complète	domicile	t	2026-08-16 16:47:28.722946+00	77	1	\N	\N	\N
265	ORD-000265	همام سليماني	0779466189	المدية	\N	بلدية ذراع السمار	\N	2650	650	Attente	domicile	f	2026-08-16 23:35:57.849406+00	91	1	\N	\N	\N
267	ORD-000267	عمراوي خيرالدين 	0668934998	\N	\N	\N	\N	5300	0	Non complète	domicile	t	2026-08-17 01:12:18.340559+00	70	1	\N	\N	\N
272	ORD-000272	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	4000	450	Attente	bureau	f	2026-08-17 11:21:12.821594+00	69	1	\N	\N	\N
266	ORD-000266	عمراوي خيرالدين 	0668934998	سوق أهراس	\N	سدراتة شارع السلم 	\N	6050	750	Non complète	domicile	t	2026-08-17 01:12:18.345999+00	70	1	\N	\N	\N
268	ORD-000268	عبد الحميد 	0666867398	\N	\N	\N	\N	2950	0	Non complète	domicile	t	2026-08-17 01:42:22.842114+00	77	1	\N	\N	\N
269	ORD-000269	عبد الحميد 	0666867398	تيميمون	\N	\N	\N	4250	1300	Non complète	domicile	t	2026-08-17 01:42:22.858688+00	77	1	\N	\N	\N
281	ORD-000281	محمد بن أحمد	0654092758	تمنراست	\N	صور	\N	6050	750	Attente	bureau	f	2026-08-17 13:04:53.371374+00	70	1	\N	\N	\N
279	ORD-000279	عيسى بن محمد 	0660060310	باتنة	\N	مسجد السلام حي 742 مسكنا باتنة	\N	5800	500	Attente	bureau	f	2026-08-17 13:00:59.426477+00	70	1	\N	\N	\N
273	ORD-000273	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	2000	450	Attente	bureau	f	2026-08-17 11:23:02.265033+00	66	1	\N	\N	\N
276	ORD-000276	عيسى بن محمد	0660060310	باتنة	\N	مس	\N	6100	800	Non complète	domicile	t	2026-08-17 12:22:57.386666+00	70	1	\N	\N	\N
278	ORD-000278	لحمر بوبكر 	0698488455	\N	\N	\N	\N	2950	0	Non complète	domicile	t	2026-08-17 12:54:32.881581+00	77	1	\N	\N	\N
277	ORD-000277	لحمر بوبكر 	0698488455	قالمة	\N	بوشقوف 	\N	3700	750	Non complète	domicile	t	2026-08-17 12:54:32.881629+00	77	1	\N	\N	\N
280	ORD-000280	عيسى بن محمد 	0660060310	\N	\N	\N	\N	5300	0	Non complète	domicile	t	2026-08-17 13:00:59.427383+00	70	1	\N	\N	\N
283	ORD-000283	عبد الرحمان	0669955128	تمنراست	\N	\N	\N	6600	1300	Non complète	domicile	t	2026-08-17 16:19:10.817361+00	70	1	\N	\N	\N
282	ORD-000282	عبد الرحمان	0669955128	\N	\N	\N	\N	5300	0	Non complète	domicile	t	2026-08-17 16:19:10.787641+00	70	1	\N	\N	\N
285	ORD-000285	موسى بربارة	0658824490	سطيف	\N	حمام قرقور طجل	\N	3700	750	Attente	domicile	f	2026-08-17 16:44:16.565502+00	77	1	\N	\N	\N
286	ORD-000286	عبد الرحمن بعموري 	0671582009	تمنراست	\N	قطع الواد	\N	6600	1300	Attente	domicile	f	2026-08-17 17:00:09.556429+00	70	1	\N	\N	\N
288	ORD-000288	عبدالقادر  ركله	0665509204	بومرداس	\N	بومرداس	\N	2400	400	Attente	bureau	f	2026-08-17 20:50:33.750042+00	91	1	\N	\N	\N
287	ORD-000287	بن يحي عمار 	0668961933	إليزي	\N	بلدية برج عمر ادريس 	\N	4200	1250	Attente	domicile	f	2026-08-17 19:52:22.304121+00	77	1	\N	\N	\N
337	ORD-000337	عبد الجبار بن أحمد 	0773334794	البويرة	\N	بلدية أولاد راشد مركز	\N	15200	0	Attente	domicile	f	2026-08-28 07:40:22.968011+00	8	1	\N	\N	\N
289	ORD-000289	بدراوي مراد 	0659233877	عنابة	\N	22 شارع بوزبيد أحمد -بلدية عنابة - la place Alexis Lambert	\N	3700	750	Attente	domicile	f	2026-08-18 05:07:46.475204+00	77	1	\N	\N	\N
290	ORD-000290	عبدالقادر	0697652292	بشار	\N	بشار	\N	3950	1000	Non complète	domicile	t	2026-08-18 06:43:53.599259+00	77	1	\N	\N	\N
317	ORD-000317	بوزيت يوسف	0661667501	سطيف	\N	9 شارع بحي مسعود	\N	5300	750	Attente	domicile	f	2026-08-22 13:04:18.106843+00	63	1	\N	\N	\N
312	ORD-000312	عمراوي خيرالدين 	0668934998	سوق أهراس	\N	سدراتة شارع السلم 	\N	12900	0	Non complète	domicile	t	2026-08-22 01:50:02.21087+00	99	1	\N	\N	\N
291	ORD-000291	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	5000	450	Attente	bureau	f	2026-08-18 11:14:38.752427+00	63	1	\N	\N	\N
301	ORD-000301	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	1900	450	Attente	bureau	f	2026-08-21 21:52:43.711586+00	67	1	\N	\N	\N
292	ORD-000292	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	4900	450	Attente	bureau	f	2026-08-18 11:15:43.43512+00	73	1	\N	\N	\N
293	ORD-000293	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	4000	450	Attente	bureau	f	2026-08-18 11:16:47.160389+00	69	1	\N	\N	\N
302	ORD-000302	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	2100	450	Attente	bureau	f	2026-08-21 21:55:13.375181+00	68	1	\N	\N	\N
294	ORD-000294	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	2000	450	Attente	bureau	f	2026-08-18 11:18:33.715182+00	66	1	\N	\N	\N
295	ORD-000295	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	4900	450	Attente	bureau	f	2026-08-18 11:20:01.900566+00	73	1	\N	\N	\N
296	ORD-000296	حمزة زرور	0791901590	\N	\N	\N	\N	35000	0	Non complète	domicile	t	2026-08-21 18:23:32.150692+00	32	1	\N	\N	\N
313	ORD-000313	سيف الدين 	0667533475	\N	\N	\N	\N	12900	0	Non complète	domicile	t	2026-08-22 04:43:04.141498+00	99	1	\N	\N	\N
303	ORD-000303	رابحي أحمد 	0666240817	الشلف	\N	الشلف	\N	2350	450	Attente	bureau	f	2026-08-21 21:56:48.426622+00	76	1	\N	\N	\N
297	ORD-000297	حمزة زرور	0791901590	أم البواقي	\N	مسجد البشير الإبراهيمي عين كرشةعين كرشة	\N	35000	0	Attente	domicile	f	2026-08-21 18:23:32.150684+00	32	1	\N	\N	\N
298	ORD-000298	Hidous 	0696667233	الجزائر	\N	Rue debbih cherif alger centre 	\N	12900	0	Attente	domicile	f	2026-08-21 18:58:38.440557+00	99	1	\N	\N	\N
299	ORD-000299	أبو عبد الرحمن 	0797553759	الجزائر	\N	\N	\N	12900	0	Non complète	domicile	t	2026-08-21 19:00:52.796317+00	99	1	\N	\N	\N
326	ORD-000326	جماوي محمد الامين	0665605597	تمنراست	\N	تمنراست 	\N	15200	0	Non complète	bureau	t	2026-08-27 12:39:24.936241+00	8	1	\N	\N	\N
305	ORD-000305	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	4950	450	Attente	bureau	f	2026-08-21 22:00:17.277022+00	97	1	\N	\N	\N
321	ORD-000321	منير	0556578885	بسكرة	\N	بسكره 	\N	12900	0	Non complète	domicile	t	2026-08-23 14:53:58.098781+00	99	1	\N	\N	\N
300	ORD-000300	شيخ عبد الحكيم 	0553916865	الجزائر	\N	جسر قسطينة عين مالحة 	\N	16700	0	Attente	domicile	f	2026-08-21 20:39:21.151804+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
309	ORD-000309	ايمن بلقاسم 	0774930901	وهران	\N	رقم 1 بلوك 10  اقامة  تونسي حي الياسمين  حي الصباح وهرانسي 	\N	35000	0	Attente	domicile	f	2026-08-21 23:32:16.341047+00	32	1	\N	\N	\N
310	ORD-000310	لحسن	0657101057	\N	\N	\N	\N	35000	0	Non complète	domicile	t	2026-08-22 00:09:32.630145+00	32	1	\N	\N	\N
306	ORD-000306	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	2200	450	Attente	bureau	f	2026-08-21 22:07:37.932809+00	79	1	\N	\N	\N
315	ORD-000315	كمال	0676978670	تلمسان	\N	دائرة مغنية حي عمر المختار	\N	16700	0	Non complète	domicile	t	2026-08-22 04:56:09.313248+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
308	ORD-000308	رابحي أحمد 	0666240017	الشلف	\N	الشلف	\N	5700	450	Attente	bureau	f	2026-08-21 22:09:52.940592+00	21	1	\N	\N	\N
316	ORD-000316	يوسف بوزيت	0661667501	سطيف	\N	9 شارع بحري مسعود	\N	35000	0	Attente	domicile	f	2026-08-22 12:27:18.467626+00	32	1	\N	\N	\N
311	ORD-000311	لحسن	0657101057	وهران	\N	بلديةسيدي شحمي	\N	35000	0	Attente	domicile	f	2026-08-22 00:09:33.262747+00	32	1	\N	\N	\N
319	ORD-000319	أحمد arbouche	0792118076	عين الدفلى	\N	حي ٨٨ مسكن العطاف	\N	35000	0	Attente	domicile	f	2026-08-22 16:30:37.738111+00	32	1	\N	\N	\N
329	ORD-000329	هنيه محمد الصالح	0675121849	تمنراست	\N	سورسوف تمنراست	\N	15200	0	Attente	domicile	f	2026-08-27 19:25:38.11253+00	8	1	\N	\N	\N
324	ORD-000324	عبدو	0698076610	تمنراست	\N	\N	\N	35000	0	Non complète	bureau	t	2026-08-23 21:32:02.214219+00	32	1	\N	\N	\N
322	ORD-000322	Safa 	0659151525	بشار	\N	Frer	\N	70000	0	Attente	bureau	f	2026-08-23 16:20:15.31993+00	32	2	\N	\N	\N
320	ORD-000320	عفيف لعطار 	0775913842	مستغانم	\N	حي عبان رمضان	\N	35000	0	Attente	bureau	f	2026-08-23 05:41:16.907485+00	32	1	\N	\N	\N
323	ORD-000323	Toufik hatachen	0540300648	البليدة	\N	Blida ville	\N	35000	0	Attente	domicile	f	2026-08-23 17:41:43.118986+00	32	1	\N	\N	\N
327	ORD-000327	اسماعيل بوعسرية	0668618416	توقرت	\N	حي اولاد القمولي دائرة وبلدية الطيبات	\N	15200	0	Attente	domicile	f	2026-08-27 15:57:20.968196+00	8	1	\N	\N	\N
325	ORD-000325	حسين 	0668856653	باتنة	\N	سونتر	\N	15200	0	Attente	bureau	f	2026-08-27 11:06:19.637611+00	8	1	\N	\N	\N
332	ORD-000332	هنيه محمد الصالح	0675121849	تمنراست	\N	سورسوف تمنراست	\N	15200	0	Attente	domicile	f	2026-08-27 19:55:43.329063+00	8	1	\N	\N	\N
331	ORD-000331	هنيه محمد الصالح	0675121849	تمنراست	\N	سورسوف تمنراست	\N	4150	1300	Attente	domicile	f	2026-08-27 19:28:10.509503+00	6	1	\N	\N	\N
333	ORD-000333	هنيه محمد الصالح	0675121849	تمنراست	\N	سورسوف تمنراست	\N	3600	750	Attente	bureau	f	2026-08-27 19:58:41.245704+00	6	1	\N	\N	\N
335	ORD-000335	هنيه محمد الصالح	0675121849	تمنراست	\N	سورسوف تمنراست	\N	11800	0	Attente	domicile	f	2026-08-27 20:04:32.396867+00	9	1	\N	\N	\N
357	ORD-000357	أحمد سلطاني	0556567717	الجلفة	\N	حي اولاد عطاء الله سيدي لعجال	\N	16700	0	Attente	bureau	f	2026-09-05 11:57:59.079764+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
339	ORD-000339	عبد الجبار بن أحمد 	0675914987	البويرة	\N	بلدية أولاد راشد مركز 	\N	15200	0	Attente	domicile	f	2026-08-28 13:35:05.451725+00	8	1	\N	\N	\N
358	ORD-000358	ليحيو اسماعيل 	0555757371	\N	\N	\N	\N	16700	0	Non complète	domicile	t	2026-09-05 19:05:38.765538+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
371	ORD-000371	\N	0553307645	\N	\N	\N	\N	12900	0	Non complète	domicile	t	2026-09-06 11:01:57.64574+00	99	1	\N	\N	\N
348	ORD-000348	Remmani Mohammed 	0559567828	تلمسان	\N	رابح رابح، سيدي بوجنان رقم 3 بلدية السواني	\N	29500	0	Attente	domicile	f	2026-08-29 13:40:33.342021+00	85	1	\N	\N	\N
340	ORD-000340	عثمان محمد 	0655356409	جانت	\N	برج حوس	\N	12900	0	Attente	domicile	f	2026-08-28 18:22:17.012446+00	99	1	\N	\N	\N
350	ORD-000350	ايدار فيصل	0676328097	\N	\N	\N	\N	15200	0	Non complète	domicile	t	2026-08-29 14:53:08.467174+00	8	1	\N	\N	\N
359	ORD-000359	ليحيو اسماعيل 	0555757371	الوادي	\N	حي لقطوطة 	\N	16700	0	Attente	bureau	f	2026-09-05 19:05:38.815296+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
341	ORD-000341	نور الدين بن محمد	0550546754	الجزائر	\N	الرويبة	\N	15200	0	Attente	domicile	f	2026-08-28 20:56:58.298072+00	8	1	\N	\N	\N
342	ORD-000342	Remmani Mohammed 	0559567828	تلمسان	\N	\N	\N	29500	0	Non complète	domicile	t	2026-08-28 21:26:57.04843+00	85	1	\N	\N	\N
360	ORD-000360	سمير	0559784384	\N	\N	\N	\N	12900	0	Non complète	domicile	t	2026-09-05 20:40:22.904805+00	99	1	\N	\N	\N
349	ORD-000349	ايدار فيصل	0676328097	ورقلة	\N	حي النصر	\N	15200	0	Attente	bureau	f	2026-08-29 14:53:08.466121+00	8	1	\N	\N	\N
343	ORD-000343	زواني بن يوسف 	0661501524	عين تموشنت	\N	حي الزيتون 	\N	12900	0	Attente	domicile	f	2026-08-28 22:10:56.979411+00	99	1	\N	\N	\N
344	ORD-000344	محفوطي عبد الجليل	0673718201	\N	\N	\N	\N	15200	0	Non complète	domicile	t	2026-08-29 05:56:27.014652+00	8	1	\N	\N	\N
345	ORD-000345	محفوطي عبد الجليل	0673718201	البويرة	\N	الاخضرية	\N	15200	0	Attente	bureau	f	2026-08-29 05:56:27.408331+00	8	1	\N	\N	\N
375	ORD-000375	فلاحي 	0770020700	غليزان	\N	بلدية جديوية	\N	4150	750	Attente	domicile	f	2026-09-06 13:45:45.690105+00	11	1	\N	\N	\N
361	ORD-000361	سمير	0559784384	الجزائر	\N	برج الكيفان	\N	12900	0	Attente	domicile	f	2026-09-05 20:40:23.424696+00	99	1	\N	\N	\N
362	ORD-000362	 زرمان محمد	0662045572	\N	\N	\N	\N	29600	0	Non complète	domicile	t	2026-09-06 03:51:45.38903+00	100	1	\N	\N	\N
346	ORD-000346	شقروني أمين	0778302714	وهران	\N	قطب زابانة مسرغين aadl	\N	16700	0	Attente	domicile	f	2026-08-29 12:37:41.863423+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
351	ORD-000351	عقباوي الخليفة 	0675272382	تمنراست	\N	تهقرت	\N	15200	0	Attente	bureau	f	2026-08-29 15:03:55.204355+00	8	1	\N	\N	\N
355	ORD-000355	عمر	0553303697	وهران	\N	\N	\N	12900	0	Non complète	domicile	t	2026-08-29 17:53:35.267741+00	99	1	\N	\N	\N
347	ORD-000347	محمد	0676834682	المسيلة	\N	بلدية اولاد عدي لقبالة	\N	15200	0	Attente	domicile	f	2026-08-29 13:28:20.847042+00	8	1	\N	\N	\N
369	ORD-000369	Ouahid	0552015599	تبسة	\N	تبسة حي فاطمة الزهراء 	\N	29600	0	Attente	domicile	f	2026-09-06 06:17:51.227728+00	100	1	\N	\N	\N
363	ORD-000363	 زرمان محمد	0662045572	المنيعة	\N	حفرة العباس	\N	29600	0	Attente	bureau	f	2026-09-06 03:51:45.721676+00	100	1	\N	\N	\N
352	ORD-000352	محمد زوبير 	0656746402	تيارت	\N	بلدية وادي ليلي 	\N	29500	0	Attente	domicile	f	2026-08-29 16:18:08.307536+00	85	1	\N	\N	\N
354	ORD-000354	زميري عبدالله	0662174698	\N	\N	اولادسعيدتيميمون	\N	15200	0	Non complète	domicile	t	2026-08-29 17:48:27.507879+00	8	1	\N	\N	\N
353	ORD-000353	Oussama 	0772821722	الوادي	\N	Rimal	\N	16000	0	Attente	domicile	f	2026-08-29 17:40:09.252863+00	99	1	اضافة صحيح مسلم من نفس الطبعة	\N	\N
364	ORD-000364	هشام	0659322656	\N	\N	\N	\N	12900	0	Non complète	domicile	t	2026-09-06 04:38:06.932944+00	99	1	\N	\N	\N
365	ORD-000365	هشام	0659322656	تيزي وزو	\N	تيرمتين بلدية 	\N	12900	0	Non complète	domicile	t	2026-09-06 04:38:06.973411+00	99	1	\N	\N	\N
366	ORD-000366	هشام	0659322656	تيزي وزو	\N	تيرمتين بلدية 	\N	16700	0	Attente	domicile	f	2026-09-06 04:38:06.984614+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
367	ORD-000367	هشام	0659322656	تيزي وزو	\N	\N	\N	12900	0	Non complète	domicile	t	2026-09-06 04:38:06.997312+00	99	1	\N	\N	\N
356	ORD-000356	كوري باي 	0667127831	عين قزام	\N	حي إظنظان تنزواتين 	\N	15200	0	Envoyé	domicile	t	2026-08-29 22:05:37.056632+00	8	1	\N	\N	\N
368	ORD-000368	\N	0552015599	\N	\N	\N	\N	29600	0	Non complète	domicile	t	2026-09-06 06:17:51.217184+00	100	1	\N	\N	\N
374	ORD-000374	فلاحي 	0770020700	غليزان	\N	بلدية جديوية	\N	2600	750	Attente	domicile	f	2026-09-06 13:44:42.877492+00	10	1	\N	\N	\N
372	ORD-000372	لزهر بودبوز	0669547643	أم البواقي	\N	الجازية 	\N	148000	0	Attente	bureau	f	2026-09-06 12:54:25.118812+00	100	5	\N	\N	\N
373	ORD-000373	فلاحي 	0770020700	\N	\N	\N	\N	1850	0	Non complète	domicile	t	2026-09-06 13:44:42.862331+00	10	1	\N	\N	\N
370	ORD-000370	بورقبة 	0658904511	سكيكدة	\N	الكركرة 	\N	16000	0	Attente	domicile	f	2026-09-06 07:09:51.155558+00	99	1	اضافة صحيح مسلم من نفس الطبعة	\N	\N
377	ORD-000377	\N	0777556484	\N	\N	\N	\N	16700	0	Non complète	domicile	t	2026-09-06 17:01:14.222385+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
376	ORD-000376	Bilel 	0541132846	الجزائر	\N	برج البحري 	\N	296000	0	Attente	domicile	f	2026-09-06 14:39:03.239034+00	100	10	\N	\N	\N
378	ORD-000378	Amine belmahdi	0777556484	معسكر	\N	زهانة	\N	16700	0	Attente	domicile	f	2026-09-06 17:01:14.396179+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
379	ORD-000379	توفيق 	0661502803	الجزائر	\N	عين الله دالي براهيم الجزائر 	\N	29600	0	Attente	domicile	f	2026-09-06 20:10:12.832284+00	100	1	\N	\N	\N
380	ORD-000380	عصماني عبد العزيز 	0797207655	معسكر	\N	شارع الريح الصافي عمارات محمدي ولاية معسكر 	\N	29600	0	Attente	domicile	f	2026-09-06 21:15:02.763762+00	100	1	\N	\N	\N
381	ORD-000381	Benc	0033618828448	الجزائر	\N	\N	\N	29600	0	Non complète	domicile	t	2026-09-06 21:23:42.612+00	100	1	\N	\N	\N
382	ORD-000382	CHERIF Hani	0699455545	الجزائر	\N	Birkhadem clôt saint jean 	\N	16700	0	Attente	domicile	f	2026-09-07 04:38:17.619814+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
383	ORD-000383	بن عبد الله العربي 	0770127074	ميلة	\N	التلاغمة	\N	16700	0	Attente	domicile	f	2026-09-07 07:12:07.51622+00	99	1	اضافة مسند الدارمي الى المجموعة	\N	\N
\.


--
-- Data for Name: wilaya_delivery; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wilaya_delivery (id, wilaya, home_price, dhd_price, created_at, updated_at) FROM stdin;
1	أدرار	1100	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
2	الشلف	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
3	الأغواط	800	500	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
4	أم البواقي	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
5	باتنة	800	500	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
6	بجاية	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
7	بسكرة	900	550	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
8	بشار	1000	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
9	البليدة	550	300	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
10	البويرة	650	400	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
11	تمنراست	1300	750	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
12	تبسة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
13	تلمسان	800	500	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
14	تيارت	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
15	تيزي وزو	650	400	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
16	الجزائر	450	300	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
17	الجلفة	850	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
18	جيجل	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
19	سطيف	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
20	سعيدة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
21	سكيكدة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
22	سيدي بلعباس	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
23	عنابة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
24	قالمة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
25	قسنطينة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
26	المدية	650	400	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
27	مستغانم	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
28	المسيلة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
29	معسكر	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
30	ورقلة	950	550	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
31	وهران	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
32	البيض	1000	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
33	إليزي	1250	750	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
34	برج بوعريريج	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
35	بومرداس	650	400	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
36	الطارف	800	500	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
37	تندوف	1300	750	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
38	تيسمسيلت	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
39	الوادي	950	550	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
40	خنشلة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
41	سوق أهراس	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
42	تيبازة	650	400	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
43	ميلة	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
44	عين الدفلى	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
45	النعامة	1000	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
46	عين تموشنت	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
47	غرداية	950	550	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
48	غليزان	750	450	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
49	تيميمون	1300	700	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
50	برج باجي مختار	1900	1800	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
51	أولاد جلال	900	550	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
52	بني عباس	1200	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
53	عين صالح	1150	650	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
54	عين قزام	1900	1900	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
55	توقرت	1000	600	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
56	جانت	1900	1900	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
57	المغير	950	500	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
58	المنيعة	950	600	2026-06-21 11:11:07.381251+00	2026-06-21 11:11:07.381251+00
\.


--
-- Name: book_bundles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.book_bundles_id_seq', 23, true);


--
-- Name: book_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.book_images_id_seq', 342, true);


--
-- Name: book_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.book_options_id_seq', 68, true);


--
-- Name: books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.books_id_seq', 100, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 28, true);


--
-- Name: delivery_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_settings_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1539, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 383, true);


--
-- Name: wilaya_delivery_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wilaya_delivery_id_seq', 116, true);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: book_bundles book_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bundles
    ADD CONSTRAINT book_bundles_pkey PRIMARY KEY (id);


--
-- Name: book_images book_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_images
    ADD CONSTRAINT book_images_pkey PRIMARY KEY (id);


--
-- Name: book_options book_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_options
    ADD CONSTRAINT book_options_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: delivery_settings delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_settings
    ADD CONSTRAINT delivery_settings_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: wilaya_delivery wilaya_delivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wilaya_delivery
    ADD CONSTRAINT wilaya_delivery_pkey PRIMARY KEY (id);


--
-- Name: wilaya_delivery wilaya_delivery_wilaya_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wilaya_delivery
    ADD CONSTRAINT wilaya_delivery_wilaya_key UNIQUE (wilaya);


--
-- Name: orders commandes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER commandes AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://bpuwdyfrawoqlaxvjshw.supabase.co/functions/v1/sync-order-to-sheets', 'POST', '{"x-webhook-secret":"lkdjsqngvpoihn,kerzqnfj;nbdfpqsokn,frqezmjgh''rnezgbflqsskhdf"}', '{}', '5000');


--
-- Name: delivery_settings delivery_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_settings_updated_at BEFORE UPDATE ON public.delivery_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: orders set_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW WHEN (((new.order_number IS NULL) OR (new.order_number ~~ 'ORD-%'::text))) EXECUTE FUNCTION public.generate_order_number();


--
-- Name: admins admins_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: book_bundles book_bundles_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_bundles
    ADD CONSTRAINT book_bundles_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_images book_images_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_images
    ADD CONSTRAINT book_images_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_options book_options_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_options
    ADD CONSTRAINT book_options_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;


--
-- Name: orders Admin delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = auth.uid()))));


--
-- Name: orders Admin read orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin read orders" ON public.orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = auth.uid()))));


--
-- Name: orders Admin update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admins
  WHERE (admins.id = auth.uid()))));


--
-- Name: order_items Auth all order_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth all order_items" ON public.order_items FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: book_images Auth write book_images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write book_images" ON public.book_images USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: books Auth write books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write books" ON public.books USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: book_bundles Auth write bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write bundles" ON public.book_bundles USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: categories Auth write categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write categories" ON public.categories USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: delivery_settings Auth write delivery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write delivery" ON public.delivery_settings FOR UPDATE USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: wilaya_delivery Auth write wilaya_delivery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth write wilaya_delivery" ON public.wilaya_delivery USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: admins Authenticated can read admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read admins" ON public.admins FOR SELECT TO authenticated USING (true);


--
-- Name: order_items Public insert order_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: book_images Public read book_images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read book_images" ON public.book_images FOR SELECT USING (true);


--
-- Name: books Public read books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read books" ON public.books FOR SELECT USING (true);


--
-- Name: book_bundles Public read bundles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read bundles" ON public.book_bundles FOR SELECT USING (true);


--
-- Name: categories Public read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);


--
-- Name: delivery_settings Public read delivery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read delivery" ON public.delivery_settings FOR SELECT USING (true);


--
-- Name: wilaya_delivery Public read wilaya_delivery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read wilaya_delivery" ON public.wilaya_delivery FOR SELECT USING (true);


--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items allow delete order_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow delete order_items" ON public.order_items FOR DELETE USING (true);


--
-- Name: books allow_execute_decrement; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_execute_decrement ON public.books FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: book_options auth write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "auth write" ON public.book_options USING (true) WITH CHECK (true);


--
-- Name: book_bundles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_bundles ENABLE ROW LEVEL SECURITY;

--
-- Name: book_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_images ENABLE ROW LEVEL SECURITY;

--
-- Name: book_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.book_options ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: book_options public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read" ON public.book_options FOR SELECT USING (true);


--
-- Name: wilaya_delivery; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wilaya_delivery ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict uYOxZxGEbAVaxaTltFgpSflQG5bbCwcSdCkLbje8W8LGyd7ZKRwQyRcvrzk26yV

