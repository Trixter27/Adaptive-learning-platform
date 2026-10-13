"""Run `python -m app.workers.processing --once` or poll with `--poll`.

One worker is sufficient for v0.1. Atomic claim prevents duplicate execution.
Interrupted processing jobs require explicit operator recovery (see architecture docs).
"""

import argparse
import asyncio

from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import utc_now
from app.db.session import SessionLocal
from app.models.domain import ProcessingJob
from app.services import factories
from app.services.knowledge.base import KnowledgeService


async def execute_job(db: Session, job_id, knowledge: KnowledgeService) -> bool:
    claimed = db.execute(
        update(ProcessingJob)
        .where(ProcessingJob.id == job_id, ProcessingJob.status == "pending")
        .values(status="processing", stage="extracting_content", progress=10, started_at=utc_now())
    )
    db.commit()
    if claimed.rowcount != 1:
        return False
    try:
        job = db.get(ProcessingJob, job_id)
        for stage, progress in [("analyzing_content", 30), ("building_course", 50)]:
            job.stage, job.progress = stage, progress
            db.commit()
        await knowledge.process_course(job.course_id)
        db.flush()
        # Mock stage markers only; no embeddings or index are actually created.
        for stage, progress in [("creating_embeddings", 75), ("indexing", 90)]:
            job.stage, job.progress = stage, progress
            db.flush()
        job.status, job.stage, job.progress = "completed", "completed", 100
        job.completed_at = utc_now()
        db.commit()
    except Exception:
        db.rollback()
        job = db.get(ProcessingJob, job_id)
        if job is not None:
            job.status = "failed"
            job.error = "PROCESSING_FAILED: course processing failed; inspect worker logs."
            job.completed_at = utc_now()
            db.commit()
        import logging

        logging.getLogger(__name__).exception("Processing job %s failed", job_id)
    return True


async def run_once(factory: sessionmaker[Session] = SessionLocal) -> bool:
    with factory() as db:
        job_id = db.scalar(
            select(ProcessingJob.id)
            .where(ProcessingJob.status == "pending")
            .order_by(ProcessingJob.created_at)
            .limit(1)
        )
        if job_id is None:
            return False
        return await execute_job(db, job_id, factories.create_knowledge(db))


async def main(poll: bool) -> None:
    while True:
        worked = await run_once()
        if not poll:
            return
        if not worked:
            await asyncio.sleep(2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--poll", action="store_true")
    parser.add_argument(
        "--once", action="store_true", help="Process at most one pending job (default)"
    )
    asyncio.run(main(parser.parse_args().poll))
