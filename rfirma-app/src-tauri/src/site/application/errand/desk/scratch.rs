//! El documento de paso de la mesa: dónde se escribe, con la extensión del tipo de sus bytes (ADR-0050); no decide cuándo se borra.

use std::path::PathBuf;

use crate::documents::domain::handles;
use crate::site::application::session::SiteRefusal;
use crate::site::domain::protocol::type_of;
use crate::site::ports::{FilterEngine, PolicyEngine};

use super::super::state::LiveErrand;
use super::ErrandDesk;

pub(in crate::site::application) fn keep_the_document<E: FilterEngine, P: PolicyEngine>(
    desk: &ErrandDesk<'_, E, P>,
    live: &LiveErrand,
    bytes: &[u8],
) -> Result<String, SiteRefusal> {
    let path = write_the_document(desk, bytes)?;
    live.keep_the_scratch(path.clone(), desk.scratch.clone());
    Ok(desk.neighbours.open_unrecorded(path))
}

fn write_the_document<E: FilterEngine, P: PolicyEngine>(
    desk: &ErrandDesk<'_, E, P>,
    bytes: &[u8],
) -> Result<PathBuf, SiteRefusal> {
    desk.scratch
        .make_the_folder(&desk.scratch_dir)
        .map_err(SiteRefusal::ScratchFolderMissing)?;
    let path = desk.scratch_dir.join(format!(
        "{}.{}",
        handles::mint(),
        type_of(bytes).extension()
    ));
    desk.scratch
        .write(&path, bytes)
        .map_err(SiteRefusal::ScratchUnwritable)?;
    Ok(path)
}
