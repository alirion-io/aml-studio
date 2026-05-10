import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import FolderSpecialOutlinedIcon from '@mui/icons-material/FolderSpecialOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ArtefactKind } from '../../types/artefact';

export const KIND_ICONS: Record<ArtefactKind, SvgIconComponent> = {
  agent: SmartToyOutlinedIcon,
  tool: BuildOutlinedIcon,
  kb: LibraryBooksOutlinedIcon,
  iam: VpnKeyOutlinedIcon,
  model: MemoryOutlinedIcon,
  collection: FolderSpecialOutlinedIcon,
  guardrail: GppGoodOutlinedIcon,
};
