import React, { Component, PropTypes } from 'react';
import './index.css';

const propTypes = {
  isPlaying: PropTypes.bool,
  autoPlay: PropTypes.bool,
  loop: PropTypes.bool,
  children: PropTypes.any,

  audioSrc: PropTypes.string,
  author: PropTypes.string,
  title: PropTypes.string,
  style: PropTypes.string,

  barWidth: PropTypes.number,
  barHeight: PropTypes.number,
  barSpacing: PropTypes.number,
  barColor: PropTypes.string,
  shadowBlur: PropTypes.number,
  shadowColor: PropTypes.string
};

const defaultProps = {
  barWidth: 2,
  barHeight: 2,
  barSpacing: 5,
  barColor: '#cafdff',
  shadowBlur: 10,
  shadowColor: '#ffffff',
  font: ['12px', 'Helvetica'],
  style: 'lounge'
};
let INTERVAL = null;
const FFT_SIZE = 2048;
let TYPE = {
        'lounge': 'renderLounge'
    };
const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

class Visualizer extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false
    };

    this.setAnalyser = this.setAnalyser.bind(this);
    this.setFrequencyData = this.setFrequencyData.bind(this);
    this.setBufferSourceNode = this.setBufferSourceNode.bind(this);
    this.duration = 0;
    this.minutes = '00';
    this.seconds = '00';
    this.gradient = null;
    this.setCanvasStyles = this.setCanvasStyles.bind(this);
    this.bindEvents = this.bindEvents.bind(this);
    this.playSound = this.playSound.bind(this);
  }

  componentDidMount() {
    this.setAnalyser();
    this.setFrequencyData();
    this.setBufferSourceNode();
    this.setCanvasStyles();
    this.bindEvents();
  }


  setAnalyser() {
    this.analyser = ctx.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.6;
    this.analyser.fftSize = FFT_SIZE;
  }

  setFrequencyData() {
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  setBufferSourceNode() {
    this.sourceNode = ctx.createBufferSource();
    console.log('sourcNode');
    console.log(this.sourceNode);
    this.sourceNode.loop = this.props.loop;
    this.sourceNode.connect(this.analyser);
    this.sourceNode.connect(ctx.destination);
    this.sourceNode.onended = () => {
      clearInterval(INTERVAL);
      this.sourceNode.disconnect();
      this.resetTimer();
      this.setState({
        isPlaying: false
      });
      this.sourceNode = ctx.createBufferSource();
    };
    this.sourceNode.onended.bind(this);
  }

  setCanvasStyles() {
    const canvasCtx = this.canvasContext.getContext('2d');
    this.gradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
    this.gradient.addColorStop(1, this.props.barColor);
    canvasCtx.fillStyle = this.gradient;
    canvasCtx.shadowBlur = this.props.shadowBlur;
    canvasCtx.shadowColor = this.props.shadowColor;
    canvasCtx.font = this.props.font.join(' ');
    canvasCtx.textAlign = 'center';
  }

  bindEvents() {
    let _this = this;
    document.addEventListener('click', (e) => {
      if(e.target === this.canvasContext) {
        e.stopPropagation();
        if(!_this.state.isPlaying) {
          return (ctx.state === 'suspended') ? _this.playSound() : _this.loadSound();
        } else {
          return _this.pauseSound();
        }
      }
    });

    if(_this.props.autoPlay) {
      _this.loadSound();
    }
  }

  loadSound() {
    const canvasCtx = this.canvasContext.getContext('2d');
    let request = new XMLHttpRequest();
    request.open('GET', this.props.audioSrc, true);
    console.log(this.props.audioSrc);
    request.responseType = 'arraybuffer';
    canvasCtx.fillText('Loading...', this.canvasContext.width / 2 + 10, this.canvasContext.height / 2);

    request.onload = function() {
      ctx.decodeAudioData(request.response, this.playSound.bind(this), this.onError());
    }.bind(this);

    request.send();
  }

  playSound(buffer) {
    this.setState({
      isPlaying: true
    });
    if(ctx.state === 'suspended') {
      return ctx.resume();
    }
    console.log('playSound');
    console.log(buffer);

    this.sourceNode.buffer = buffer;
    this.sourceNode.start(0);
    this.resetTimer();
    this.startTimer();
    this.renderFrame();
  }

  pauseSound() {
    ctx.suspend();
    this.setState({
      isPlaying: false
    });
  }

  startTimer() {
    let _this = this;
    INTERVAL = setInterval(() => {
      if(_this.state.isPlaying) {
        let now = new Date(_this.duration);
        let min = now.getHours();
        let sec = now.getMinutes();
        _this.minutes = (min < 10) ? '0' + min : min;
        _this.seconds = (sec < 10) ? '0' + sec : sec;
        _this.duration = now.setMinutes(sec + 1);
      }
    }, 1000);
  }

  resetTimer() {
    let time = new Date(0, 0);
    this.duration = time.getTime();
  }

  onError(e) {
    console.log('Decoding audio file Error', e);
  }

  renderFrame() {
    const canvasCtx = this.canvasContext.getContext('2d');
    requestAnimationFrame(this.renderFrame.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);
    canvasCtx.clearRect(0, 0, this.canvasContext.width, this.canvasContext.height);

    this.renderTime();
    this.renderText();
    this.renderByStyleType();
  }

  renderText() {
    const canvasCtx = this.canvasContext.getContext('2d');
    let cx = this.canvasContext.width / 2;
    let cy = this.canvasContext.height / 2;
    let correction = 10;

    canvasCtx.textBaseline = 'top';
    canvasCtx.fillText('by ' + this.props.author, cx + correction, cy);
    canvasCtx.font = parseInt(this.props.font[0], 10) + 8 + 'px ' + this.props.font[1];
    canvasCtx.textBaseline = 'bottom';
    canvasCtx.fillText(this.props.title, cx + correction, cy);
    canvasCtx.font = this.props.font.join(' ');
  }

  renderTime() {
    const canvasCtx = this.canvasContext.getContext('2d');
    let time = this.minutes + ':' + this.seconds;
    canvasCtx.fillText(time, this.canvasContext.width / 2 + 10, this.canvasContext.height / 2 + 40);
  }

  renderByStyleType() {
    return this[TYPE[this.props.style]]();
  }


  renderLounge() {
    const canvasCtx = this.canvasContext.getContext('2d');
    let cx = this.canvasContext.width / 2;
    let cy = this.canvasContext.height / 2;
    let radius = 140;
    let maxBarNum = Math.floor((radius * 2 * Math.PI) / (this.props.barWidth + this.props.barSpacing));
    let slicedPercent = Math.floor((maxBarNum * 25) / 100);
    let barNum = maxBarNum - slicedPercent;
    let freqJump = Math.floor(this.frequencyData.length / maxBarNum);

    for (let i = 0; i < barNum; i++) {
        let amplitude = this.frequencyData[i * freqJump];
        let alfa = (i * 2 * Math.PI ) / maxBarNum;
        let beta = (3 * 45 - this.props.barWidth) * Math.PI / 180;
        let x = 0;
        let y = radius - (amplitude / 12 - this.props.barHeight);
        let w = this.props.barWidth;
        let h = amplitude / 6 + this.props.barHeight;

        canvasCtx.save();
        canvasCtx.translate(cx + this.props.barSpacing, cy + this.props.barSpacing);
        canvasCtx.rotate(alfa - beta);
        canvasCtx.fillRect(x, y, w, h);
        canvasCtx.restore();
    }
  }

  render() {
    const { audioSrc, author, title }  = this.props;
    return (
      <div>
        <div className="vz-wrapper">
        <audio src={audioSrc || ''}
               author={author}
               title={title}
               ref={(ref) => { this.audioElement = ref; }}>
               {this.props.children}
               {console.log(this.props.children)}
        </audio>
        <div className="vz-canvas-wrapper">
          <canvas ref={(canvas) => { this.canvasContext = canvas; }} width={800} height={400}/>
        </div>
        </div>
      </div>
    );
  }
}

Visualizer.propTypes = propTypes;
Visualizer.defaultProps = defaultProps;

export default Visualizer;
