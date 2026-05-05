import torch
import numpy as np
import random
import yaml
from data.xia_preprocess import generate_data
from data.animation import BVH
from back.arguments import custom_args
from back.model.mst import MST
from back.utils.save_bvh import SaveBVH

def init_seed(seed=123):
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

init_seed()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def style_transfer(cnt_path = 'data/preprocessed_xia_test/angry_13_000.bvh',
                   sty_path = 'data/preprocessed_xia_test/childlike_13_000.bvh',output_path = 'generated_motion.bvh'):
    # args = parse_args_test()
    args = custom_args()

    # Get data information
    with open('back/xia_dataset.yml', "r") as f:
        cfg = yaml.load(f, Loader=yaml.Loader)

    # Get preprocess demo data
    # cnt_path = args.demo_datapath+'/'+ args.cnt_clip + '.bvh'
    # sty_path = args.demo_datapath+'/'+ args.sty_clip + '.bvh'

    # 读取原始 BVH 的帧率信息
    _, _, cnt_frametime = BVH.load(cnt_path)
    print('Content BVH frametime: %.6f (FPS: %.1f)' % (cnt_frametime, 1.0/cnt_frametime))

    # 这里原本的downsample=2，现在改为1
    cnt_clip, cnt_feet = generate_data(cnt_path, selected_joints=cfg["selected_joints"], njoints=cfg["njoints"], downsample=1)
    sty_clip, _ = generate_data(sty_path, selected_joints=cfg["selected_joints"], njoints=cfg["njoints"], downsample=1)

    data_dist = np.load(args.dist_datapath)
    Xmean = data_dist['Xmean']
    Xstd = data_dist['Xstd']

    def normalize(x, mean, std):
        x = (x - mean) / std
        return x

    cnt_clip = normalize(cnt_clip, Xmean, Xstd)
    sty_clip = normalize(sty_clip, Xmean, Xstd)

    cnt_clip = torch.tensor(cnt_clip, dtype=torch.float).unsqueeze(0).to(device)
    cnt_feet = torch.tensor(cnt_feet, dtype=torch.float).unsqueeze(0).to(device)
    sty_clip = torch.tensor(sty_clip, dtype=torch.float).unsqueeze(0).to(device)

    # Generate temporal mask for the motion sequences & change nan to 0.0
    cnt_m  = cnt_clip[:,1,:,0]
    cnt_length  = sum(~torch.isnan(cnt_m[0])).cpu().numpy()
    cnt_mask = ~torch.isnan(cnt_m).unsqueeze(1).repeat(1, cnt_m.size(1), 1).unsqueeze(1)
    cnt_clip[torch.isnan(cnt_clip)] = 0.0
    sty_m  = sty_clip[:,1,:,0]
    sty_mask = ~torch.isnan(sty_m).unsqueeze(1).repeat(1, sty_m.size(1), 1).unsqueeze(1)
    sty_clip[torch.isnan(sty_clip)] = 0.0

    # Load model
    model = MST(False, cfg, args)
    model = model.to(device)
    model.load_checkpoint()
    model.eval()

    # Perform style transfer
    gen = model.generator(cnt_clip, sty_clip, cnt_mask, sty_mask)

    # Our model generates global translation & local pose sequence
    gen_traj = gen[0,cfg["joint_dims"]:,:cnt_length,:].cpu().detach().numpy()
    gen_body = gen[0, :cfg["joint_dims"], :cnt_length,:].cpu().detach().numpy()

    print('Generated frames: %d' % cnt_length)

    # Save output - 使用原始 BVH 的帧率
    save_bvh = SaveBVH(args)
    save_bvh.save_output(gen_body, gen_traj, filename=output_path, frametime=cnt_frametime)
    print('风格迁移完成')

if __name__ == '__main__':
    style_transfer()
   