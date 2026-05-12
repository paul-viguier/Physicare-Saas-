-- PHYSICARE® — RPC look-alike via cosine similarity (pgvector)
-- Renvoie les N leads les plus proches d'un lead source, hors lui-même.

create or replace function lookalike_leads(source_id uuid, limit_n integer default 10)
returns table (
  id uuid,
  full_name text,
  job_title text,
  lead_score integer,
  similarity float
) language sql stable as $$
  with src as (select embedding from prospect_leads where id = source_id)
  select l.id, l.full_name, l.job_title, l.lead_score,
         1 - (l.embedding <=> (select embedding from src)) as similarity
    from prospect_leads l, src
   where l.id <> source_id
     and l.embedding is not null
     and src.embedding is not null
   order by l.embedding <=> src.embedding
   limit limit_n;
$$;

-- Look-alike par cluster CUSTOMER : moyenne des embeddings clients,
-- puis k-NN parmi les NEW leads.
create or replace function lookalike_from_customers(limit_n integer default 20)
returns table (
  id uuid,
  full_name text,
  job_title text,
  company_name text,
  lead_score integer,
  similarity float
) language sql stable as $$
  with centroid as (
    select avg(embedding)::vector as v
      from prospect_leads
     where status = 'CUSTOMER' and embedding is not null and owner_id = auth.uid()
  )
  select l.id, l.full_name, l.job_title, c.name as company_name, l.lead_score,
         1 - (l.embedding <=> (select v from centroid)) as similarity
    from prospect_leads l
    left join prospect_companies c on c.id = l.company_id
   where l.status in ('NEW','CONTACTED')
     and l.embedding is not null
     and l.owner_id = auth.uid()
     and (select v from centroid) is not null
   order by l.embedding <=> (select v from centroid)
   limit limit_n;
$$;
