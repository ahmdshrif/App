import tooltipPropTypes from './TooltipPropTypes';

const defaultProps = {
    shiftHorizontal: 0,
    shiftVertical: 0,
};

const Tooltip = props => props.children;

Tooltip.propTypes = tooltipPropTypes;
Tooltip.defaultProps = defaultProps;
export default Tooltip;
